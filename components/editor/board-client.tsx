"use client";
import { useLayoutEffect, useRef, useState, useTransition, useEffect, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { ProjectSidebar, type LiveSession, type CollaborationPresence } from "@/components/editor/project-sidebar";
import { ProjectToolbar } from "@/components/editor/project-toolbar";
import { CanvasSettingsProvider, useCanvasSettings } from "@/components/editor/canvas-settings-provider";
import { saveBoardState, createLiveSession, joinLiveSession, stopLiveSession, getActiveSession, ensureBoard, getBoardState } from "@/actions/board";
import { ExportImageDialog } from "@/components/editor/export-image-dialog";
import { toast } from "@/components/ui/toast";
import { useTheme } from "@/components/theme-provider";
import { createBrowserBoardId, getOrCreateStoredBrowserBoardId, persistBrowserBoardId } from "@/lib/board-id";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserGroupIcon } from "@hugeicons/core-free-icons";

export type BoardElement = {
	id: number;
	x1: number; y1: number; x2: number; y2: number; type: string; points: Array<{ x: number; y: number }>; text?: string;
};

export function BoardClient({ initialElements, boardId }: { initialElements: BoardElement[], boardId: string }) {
	return (
		<CanvasSettingsProvider>
			<BoardEditor initialElements={initialElements} boardId={boardId} />
		</CanvasSettingsProvider>
	);
}

const SESSION_NAME_STORAGE_KEY = "collab-board-session-name";

function BoardEditor({ initialElements, boardId }: { initialElements: BoardElement[], boardId: string }) {
	const [boardIdState, setBoardIdState] = useState<string>(() => {
		if (boardId) {
			return boardId;
		}

		return getOrCreateStoredBrowserBoardId() || createBrowserBoardId();
	});
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [action, setAction] = useState<string[]>(["pencil"]);
	const [elements, setElements] = useState<BoardElement[]>(initialElements);
	const [history, setHistory] = useState<BoardElement[][]>([initialElements]);
	const [future, setFuture] = useState<BoardElement[][]>([]);
	const [isDrawing, setIsDrawing] = useState(false);
	const [, startTransition] = useTransition();
	const [canvasSize, setCanvasSize] = useState({ width: 800, height: 800 });
	const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
	const [startPanMousePosition, setStartPanMousePosition] = useState({ x: 0, y: 0 });
	const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
	const [editingElementId, setEditingElementId] = useState<number | null>(null);
	const [textInputValue, setTextInputValue] = useState("");
	const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
	const [sessionUserName, setSessionUserName] = useState(() => {
		if (typeof window === "undefined") {
			return "";
		}

		const savedName = window.localStorage.getItem(SESSION_NAME_STORAGE_KEY);
		if (savedName && savedName.trim()) {
			return savedName.trim();
		}

		const generatedName = `Guest-${Math.random().toString(36).slice(2, 8)}`;
		window.localStorage.setItem(SESSION_NAME_STORAGE_KEY, generatedName);
		return generatedName;
	});
	const [presence, setPresence] = useState<CollaborationPresence[]>([]);
	const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "offline">("connecting");
	const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
	const [socketId, setSocketId] = useState<string | null>(null);
	const socketRef = useRef<Socket | null>(null);
	const previousBoardRef = useRef<string>(boardIdState);
	const { settings } = useCanvasSettings();
	const { resolvedTheme } = useTheme();
	const strokeColor = getContrastingStrokeColor(settings.background, resolvedTheme);

	useEffect(() => {
		if (typeof window !== "undefined" && sessionUserName.trim()) {
			window.localStorage.setItem(SESSION_NAME_STORAGE_KEY, sessionUserName.trim());
		}
	}, [sessionUserName]);

	useEffect(() => {
		if (previousBoardRef.current !== boardIdState && socketRef.current) {
			socketRef.current.emit("leave-board", { boardId: previousBoardRef.current });
			socketRef.current.disconnect();
			socketRef.current = null;
			setSocketId(null);
			setPresence([]);
		}

		previousBoardRef.current = boardIdState;
	}, [boardIdState]);

	useEffect(() => {
		persistBrowserBoardId(boardIdState);
	}, [boardIdState]);

	useEffect(() => {
		if (!boardIdState) {
			return;
		}

		void ensureBoard(boardIdState).catch(console.error);
		void getBoardState(boardIdState)
			.then((storedElements) => {
				setElements((current) => {
					const nextElements = current.length > 0 ? current : (storedElements as BoardElement[]);
					setHistory([nextElements]);
					setFuture([]);
					return nextElements;
				});
			})
			.catch(console.error);
	}, [boardIdState]);

	useEffect(() => {
		const sessionId = new URLSearchParams(window.location.search).get("session");
		if (!sessionId) {
			return;
		}

		void getActiveSession(undefined, sessionId).then((session) => {
			if (!session) {
				return;
			}

			setBoardIdState(session.boardId);
			setLiveSession(session);
		}).catch(console.error);
	}, []);

	useEffect(() => {
		if (!liveSession?.id || !sessionUserName || !boardIdState) {

			if (socketRef.current) {
				socketRef.current.emit("leave-board", { boardId: boardIdState, sessionId: liveSession?.id });
				socketRef.current.disconnect();
				socketRef.current = null;
			}
			return;
		}

		const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ??
			(window.location.hostname === "localhost" ? "http://localhost:3001" : `http://${window.location.hostname}:3001`);
		const socket = io(socketUrl, {
			transports: ["websocket", "polling"],
			reconnection: true,
		});
		socketRef.current = socket;

		socket.on("connect", () => {
			setSocketId(socket.id ?? null);
			setConnectionStatus("connected");
			socket.emit("join-board", {
				boardId: boardIdState,
				sessionId: liveSession.id,
				userName: sessionUserName,
			});
		});

		socket.on("connect_error", () => {
			setConnectionStatus("offline");
		});

		socket.on("disconnect", () => {
			setConnectionStatus("offline");
			toast.add({
				title: "Session disconnected",
				description: "The live session connection was lost.",
				type: "warning",
			});
			setLiveSession(null);
			setPresence([]);
		});

		socket.on("session-disconnected", (payload: { boardId?: string; reason?: string }) => {
			if (payload.boardId !== boardIdState) {
				return;
			}

			setConnectionStatus("offline");
			setLiveSession(null);
			setPresence([]);
			const nextUrl = new URL(window.location.href);
			nextUrl.searchParams.delete("session");
			window.history.replaceState({}, "", nextUrl.toString());
			toast.add({
				title: "Session disconnected",
				description: payload.reason ? `Live session ended: ${payload.reason}.` : "The live session was disconnected.",
				type: "warning",
			});
		});

		socket.on("board-state", (payload: { boardId?: string; sessionId?: string; elements?: BoardElement[] }) => {
			if ((payload.boardId === boardIdState || payload.sessionId === liveSession?.id) && Array.isArray(payload.elements)) {
				setElements(payload.elements);
				setHistory([payload.elements]);
				setFuture([]);
			}
		});

		socket.on("board-update", (payload: { boardId?: string; sessionId?: string; elements?: BoardElement[] }) => {
			if ((payload.boardId === boardIdState || payload.sessionId === liveSession?.id) && Array.isArray(payload.elements)) {
				setElements(payload.elements);
				setHistory(prev => {
					if (prev.length === 0 || prev[prev.length - 1] !== payload.elements) {
						return [...prev, payload.elements!];
					}
					return prev;
				});
				setFuture([]);
			}
		});

		socket.on("presence-update", (payload: { boardId?: string; sessionId?: string; participants?: CollaborationPresence[] }) => {
			if (payload.boardId === boardIdState || payload.sessionId === liveSession?.id) {
				setPresence(payload.participants ?? []);
			}
		});

		socket.on("cursor-update", (payload: { userId: string; name: string; color: string; x: number; y: number }) => {
			setPresence((current) => {
				const existing = current.find((participant) => participant.id === payload.userId);
				if (existing) {
					return current.map((participant) =>
						participant.id === payload.userId
							? { ...participant, name: payload.name, color: payload.color, x: payload.x, y: payload.y, connected: true }
							: participant,
					);
				}

				return [
					...current,
					{ id: payload.userId, name: payload.name, color: payload.color, x: payload.x, y: payload.y, connected: true },
				];
			});
		});

		return () => {
			socket.emit("leave-board", { boardId: boardIdState, sessionId: liveSession?.id });
			socket.disconnect();
			socketRef.current = null;
			setSocketId(null);
			setPresence([]);
		};
	}, [boardIdState, liveSession?.id, sessionUserName]);

	const handleStartSession = async (name: string): Promise<LiveSession | void> => {
		const cleanedName = name.trim() || sessionUserName.trim() || "Guest";
		setConnectionStatus("connecting");
		const session = await createLiveSession(boardIdState, cleanedName);
		setBoardIdState(session.boardId);
		setSessionUserName(cleanedName);
		setLiveSession(session);
		const nextUrl = new URL(window.location.href);
		nextUrl.searchParams.set("session", session.id);
		window.history.replaceState({}, "", nextUrl.toString());
		return session;
	};

	const handleJoinSession = async (name: string): Promise<LiveSession | void> => {
		const cleanedName = name.trim() || sessionUserName.trim() || "Guest";
		setConnectionStatus("connecting");
		const sessionId = new URLSearchParams(window.location.search).get("session");
		if (!sessionId) {
			throw new Error("This share link is missing a session ID.");
		}
		const session = await joinLiveSession(boardIdState, sessionId, cleanedName);
		setBoardIdState(session.boardId);
		setSessionUserName(cleanedName);
		setLiveSession(session);
		return session;
	};

	const handleStopSession = async () => {
		const sessionId = liveSession?.id ?? new URLSearchParams(window.location.search).get("session");
		if (!sessionId) {
			setConnectionStatus("offline");
			setLiveSession(null);
			return;
		}
		await stopLiveSession(boardIdState, sessionUserName, sessionId);
		setConnectionStatus("offline");
		setLiveSession(null);
		setSessionUserName("");
		const nextUrl = new URL(window.location.href);
		nextUrl.searchParams.delete("session");
		window.history.replaceState({}, "", nextUrl.toString());
	};

	useLayoutEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			console.warn("canvas not found.");
			return;
		}
		const resizeCanvas = () => {
			const parent = canvas.parentElement;
			const width = parent?.clientWidth || 800;
			const height = parent?.clientHeight || 800;
			canvas.width = width;
			canvas.height = height;
			setCanvasSize({ width, height });
		};
		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);
		return () => window.removeEventListener('resize', resizeCanvas);
	}, []);

	useLayoutEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			console.warn("canvas not found.");
			return;
		}
		const context = canvas.getContext("2d");
		if (!context) {
			console.warn("context not found.");
			return;
		}
		context.clearRect(0, 0, canvasSize.width, canvasSize.height);

		context.save();
		context.translate(panOffset.x, panOffset.y);

		elements.forEach(element => {
			context.beginPath();
			context.strokeStyle = strokeColor;
			context.lineWidth = 2;
			context.lineCap = "round";
			context.lineJoin = "round";
			if (element.type === 'line') {
				context.moveTo(element.x1, element.y1)
				context.lineTo(element.x2, element.y2)
				context.stroke();
			} else if (element.type === 'arrow') {
				const headlen = 15;
				const dx = element.x2 - element.x1;
				const dy = element.y2 - element.y1;
				const angle = Math.atan2(dy, dx);
				context.moveTo(element.x1, element.y1);
				context.lineTo(element.x2, element.y2);
				context.lineTo(element.x2 - headlen * Math.cos(angle - Math.PI / 6), element.y2 - headlen * Math.sin(angle - Math.PI / 6));
				context.moveTo(element.x2, element.y2);
				context.lineTo(element.x2 - headlen * Math.cos(angle + Math.PI / 6), element.y2 - headlen * Math.sin(angle + Math.PI / 6));
				context.stroke();
			} else if (element.type === 'square') {
				context.strokeRect(element.x1, element.y1,
					element.x2 - element.x1,
					element.y2 - element.y1
				);
			} else if (element.type === 'diamond') {
				const midX = (element.x1 + element.x2) / 2;
				const midY = (element.y1 + element.y2) / 2;
				context.moveTo(midX, element.y1);
				context.lineTo(element.x2, midY);
				context.lineTo(midX, element.y2);
				context.lineTo(element.x1, midY);
				context.closePath();
				context.stroke();
			} else if (element.type === 'circle') {
				const radius = Math.sqrt(
					Math.pow(element.x2 - element.x1, 2) + Math.pow(element.y2 - element.y1, 2)
				);
				context.arc(element.x1, element.y1, radius, 0, 2 * Math.PI);
				context.stroke();
			} else if (element.type === 'text') {
				context.font = "24px sans-serif";
				context.fillStyle = strokeColor;
				context.textBaseline = "top";
				if (element.text) {
					const lines = element.text.split('\n');
					lines.forEach((line, index) => {
						context.fillText(line, element.x1, element.y1 + index * 24);
					});
				}
			} else if (element.type === 'pencil') {
				if (element.points && element.points.length > 0) {
					context.moveTo(element.points[0].x, element.points[0].y);
					for (let i = 1; i < element.points.length; i++) {
						context.lineTo(element.points[i].x, element.points[i].y);
					}
					context.stroke();
				}
			}
		});

		if (selectedElementId !== null) {
			const selectedElement = elements.find((element) => element.id === selectedElementId);
			if (selectedElement) {
				const bounds = getElementBounds(selectedElement);
				context.save();
				context.strokeStyle = "#3b82f6";
				context.lineWidth = 1.5;
				context.setLineDash([6, 4]);
				context.strokeRect(bounds.minX - 8, bounds.minY - 8, bounds.maxX - bounds.minX + 16, bounds.maxY - bounds.minY + 16);
				context.restore();
			}
		}

		context.restore();
	}, [elements, canvasSize.width, canvasSize.height, panOffset.x, panOffset.y, strokeColor, selectedElementId])

	function handleMouseUp() {
		setIsDrawing(false);
		if (editingElementId !== null) return;

		setHistory(prev => {
			if (prev.length === 0 || prev[prev.length - 1] !== elements) {
				return [...prev, elements];
			}
			return prev;
		});
		setFuture([]);

		if (socketRef.current && liveSession?.id) {
			socketRef.current.emit("board-state-change", { boardId: boardIdState, sessionId: liveSession.id, elements });
		}
		startTransition(() => {
			saveBoardState(boardIdState, elements).catch(console.error);
		});
	}

	function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
		const { offsetX, offsetY } = e.nativeEvent;
		const actualX = offsetX - panOffset.x;
		const actualY = offsetY - panOffset.y;

		if (editingElementId !== null) {
			return;
		}

		const clickedTextElement = [...elements].reverse().find(el => el.type === 'text' && isPointNearElement(actualX, actualY, el));

		if (action[0] === 'text' && clickedTextElement) {
			setEditingElementId(clickedTextElement.id);
			setTextInputValue(clickedTextElement.text || "");
			setSelectedElementId(clickedTextElement.id);
			return;
		}

		if (action[0] === 'text') {
			const newElement = {
				id: Date.now(),
				type: action[0],
				x1: actualX, y1: actualY, x2: actualX, y2: actualY, points: [],
				text: "Text"
			};
			setElements((prevElements) => [...prevElements, newElement]);
			setEditingElementId(newElement.id);
			setTextInputValue("Text");
			return;
		}

		if (action[0] === 'pan') {
			setStartPanMousePosition({ x: offsetX, y: offsetY });
			setIsDrawing(true);
			return;
		}

		if (action[0] === 'select') {
			const clickedElement = [...elements].reverse().find(el => isPointNearElement(actualX, actualY, el));
			if (clickedElement) {
				setSelectedElementId(clickedElement.id);
				setStartPanMousePosition({ x: actualX, y: actualY });
				setIsDrawing(true);
			} else {
				setSelectedElementId(null);
			}
			return;
		}

		if (action[0] === 'eraser') {
			setElements((prevElements) => prevElements.filter(el => !isPointNearElement(actualX, actualY, el)));
			setIsDrawing(true);
			return;
		}

		let newElement;
		if (action[0] === 'pencil') {
			newElement = {
				id: Date.now(),
				type: action[0],
				x1: actualX, y1: actualY, x2: actualX, y2: actualY, points: [{
					x: actualX, y: actualY
				}
				]
			}
		} else {
			newElement = {
				id: Date.now(),
				type: action[0],
				x1: actualX, y1: actualY, x2: actualX, y2: actualY, points: []
			}
		}
		setElements((prevElements) => [...prevElements, newElement])
		setIsDrawing(true)

	}

	function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
		const { offsetX, offsetY } = e.nativeEvent;
		if (socketRef.current && liveSession?.id && sessionUserName) {
			socketRef.current.emit("cursor-move", { boardId: boardIdState, sessionId: liveSession.id, x: offsetX, y: offsetY, userName: sessionUserName });
		}
		if (!isDrawing) {
			return;
		}
		const actualX = offsetX - panOffset.x;
		const actualY = offsetY - panOffset.y;

		if (action[0] === 'pan') {
			setPanOffset(prev => ({
				x: prev.x + (offsetX - startPanMousePosition.x),
				y: prev.y + (offsetY - startPanMousePosition.y)
			}));
			setStartPanMousePosition({ x: offsetX, y: offsetY });
			return;
		}

		if (action[0] === 'select' && selectedElementId !== null) {
			const dx = actualX - startPanMousePosition.x;
			const dy = actualY - startPanMousePosition.y;

			setElements(prev => prev.map(el => {
				if (el.id === selectedElementId) {
					if (el.type === 'pencil') {
						return {
							...el,
							x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy,
							points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
						}
					}
					return {
						...el,
						x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy
					}
				}
				return el;
			}));
			setStartPanMousePosition({ x: actualX, y: actualY });
			return;
		}

		if (action[0] === 'eraser') {
			setElements((prevElements) => prevElements.filter(el => !isPointNearElement(actualX, actualY, el)));
			return;
		}

		setElements((prevElements) => {
			const lastIndex = prevElements.length - 1;
			if (lastIndex < 0) return prevElements;
			const lastElement = prevElements[lastIndex];

			// Create a copy of the elements array, updating only the ending coordinates of the current shape
			const elementsCopy = [...prevElements];

			if (lastElement.type === 'pencil') {
				const updatedPoints = [...lastElement.points, { x: actualX, y: actualY }];
				elementsCopy[lastIndex] = { ...lastElement, points: updatedPoints };
			} else {
				const updatedElement = { ...lastElement, x2: actualX, y2: actualY };
				elementsCopy[lastIndex] = updatedElement;
			}

			return elementsCopy;
		});
	}


	function handleTextBlur(e: React.FocusEvent<HTMLTextAreaElement>, id: number) {
		const newText = e.target.value;
		let updated: BoardElement[] = [];
		setElements(prev => {
			updated = prev.map(el => {
				if (el.id === id) {
					return { ...el, text: newText };
				}
				return el;
			});
			return updated;
		});
		setEditingElementId(prev => prev === id ? null : prev);

		setHistory(prev => [...prev, updated]);
		setFuture([]);

		if (socketRef.current && liveSession?.id) {
			socketRef.current.emit("board-state-change", { boardId: boardIdState, sessionId: liveSession.id, elements: updated });
		}
		startTransition(() => {
			saveBoardState(boardIdState, updated).catch(console.error);
		});
	}

	function handleExport() {
		const data = JSON.stringify(elements);
		const blob = new Blob([data], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `board-${boardId}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function handleImport() {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json,application/json";
		input.onchange = (e: Event) => {
			const target = e.target as HTMLInputElement;
			const file = target.files?.[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = (ev) => {
				try {
					const content = ev.target?.result as string;
					const parsed = JSON.parse(content);
					if (Array.isArray(parsed)) {
						const validElements = parsed.filter(isBoardElement);
						setElements(validElements);
						setHistory(prev => [...prev, validElements]);
						setFuture([]);
						if (socketRef.current && liveSession?.id) {
							socketRef.current.emit("board-state-change", { boardId: boardIdState, sessionId: liveSession.id, elements: validElements });
						}
						startTransition(() => {
							saveBoardState(boardIdState, validElements).catch(console.error);
						});
					}
				} catch (err) {
					console.error("Failed to parse file", err);
				}
			};
			reader.readAsText(file);
		};
		input.click();
	}

	function handleReset() {
		setElements([]);
		setHistory(prev => [...prev, []]);
		setFuture([]);
		if (socketRef.current && liveSession?.id) {
			socketRef.current.emit("board-state-change", { boardId: boardIdState, sessionId: liveSession.id, elements: [] });
		}
		startTransition(() => {
			saveBoardState(boardIdState, []).catch(console.error);
		});
	}

	const handleUndo = useCallback(() => {
		if (history.length <= 1) return;
		const newHistory = [...history];
		const currentState = newHistory.pop();
		const previousState = newHistory[newHistory.length - 1];

		if (currentState) {
			setFuture(prev => [...prev, currentState]);
		}
		setHistory(newHistory);
		setElements(previousState);

		if (socketRef.current && liveSession?.id) {
			socketRef.current.emit("board-state-change", { boardId: boardIdState, sessionId: liveSession.id, elements: previousState });
		}
		startTransition(() => {
			saveBoardState(boardIdState, previousState).catch(console.error);
		});
	}, [history, boardIdState, liveSession]);

	const handleRedo = useCallback(() => {
		if (future.length === 0) return;
		const newFuture = [...future];
		const nextState = newFuture.pop();

		if (nextState) {
			setHistory(prev => [...prev, nextState]);
			setFuture(newFuture);
			setElements(nextState);

			if (socketRef.current && liveSession?.id) {
				socketRef.current.emit("board-state-change", { boardId: boardIdState, sessionId: liveSession.id, elements: nextState });
			}
			startTransition(() => {
				saveBoardState(boardIdState, nextState).catch(console.error);
			});
		}
	}, [future, boardIdState, liveSession]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
			const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
			const isZ = e.key.toLowerCase() === 'z';
			const isY = e.key.toLowerCase() === 'y';
			const isShift = e.shiftKey;

			const targetTag = (e.target as HTMLElement | null)?.tagName;
			const isTypingTarget = targetTag === 'INPUT' || targetTag === 'TEXTAREA' || (e.target instanceof HTMLElement && e.target.isContentEditable);

			if (isCtrlOrCmd && isZ && !isShift) {
				e.preventDefault();
				handleUndo();
			} else if ((isCtrlOrCmd && isZ && isShift) || (isCtrlOrCmd && isY)) {
				e.preventDefault();
				handleRedo();
			} else if (!isTypingTarget && (e.key === 'Delete' || e.key === 'Backspace') && selectedElementId !== null) {
				e.preventDefault();
				const nextElements = elements.filter((element) => element.id !== selectedElementId);
				setElements(nextElements);
				setHistory((previousHistory) => [...previousHistory, nextElements]);
				setFuture([]);
				if (socketRef.current && liveSession?.id) {
					socketRef.current.emit("board-state-change", { boardId: boardIdState, sessionId: liveSession.id, elements: nextElements });
				}
				startTransition(() => {
					saveBoardState(boardIdState, nextElements).catch(console.error);
				});
				setSelectedElementId(null);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleUndo, handleRedo, elements, selectedElementId, boardIdState, liveSession, startTransition]);

	const [isExportModalOpen, setIsExportModalOpen] = useState(false);
	const [previewDataUrl, setPreviewDataUrl] = useState("");

	function handleExportImageRequest() {
		if (elements.length === 0) {
			toast.add({ title: "Cannot export empty canvas", type: "error" });
			return;
		}
		const canvas = canvasRef.current;
		if (canvas) {
			const tempCanvas = document.createElement("canvas");
			tempCanvas.width = canvas.width;
			tempCanvas.height = canvas.height;
			const ctx = tempCanvas.getContext("2d");
			if (ctx) {
				const bgColor = canvas.parentElement?.style.backgroundColor || "#ffffff";
				ctx.fillStyle = bgColor;
				ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
				ctx.drawImage(canvas, 0, 0);
				setPreviewDataUrl(tempCanvas.toDataURL("image/png"));
				setIsExportModalOpen(true);
			}
		}
	}

	function generateSvgContent() {
		const canvas = canvasRef.current;
		const bgColor = canvas?.parentElement?.style.backgroundColor || "#ffffff";
		let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize.width}" height="${canvasSize.height}">`;
		svgContent += `<rect width="100%" height="100%" fill="${bgColor}" />`;
		svgContent += `<g transform="translate(${panOffset.x}, ${panOffset.y})">`;

		elements.forEach(element => {
			if (element.type === 'line') {
				svgContent += `<line x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" />`;
			} else if (element.type === 'arrow') {
				const headlen = 15;
				const dx = element.x2 - element.x1;
				const dy = element.y2 - element.y1;
				const angle = Math.atan2(dy, dx);
				const x3 = element.x2 - headlen * Math.cos(angle - Math.PI / 6);
				const y3 = element.y2 - headlen * Math.sin(angle - Math.PI / 6);
				const x4 = element.x2 - headlen * Math.cos(angle + Math.PI / 6);
				const y4 = element.y2 - headlen * Math.sin(angle + Math.PI / 6);

				svgContent += `<line x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" />`;
				svgContent += `<path d="M ${element.x2} ${element.y2} L ${x3} ${y3} L ${x4} ${y4} Z" fill="${strokeColor}" />`;
			} else if (element.type === 'square') {
				const x = Math.min(element.x1, element.x2);
				const y = Math.min(element.y1, element.y2);
				const w = Math.abs(element.x2 - element.x1);
				const h = Math.abs(element.y2 - element.y1);
				svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" stroke="${strokeColor}" stroke-width="2" fill="none" />`;
			} else if (element.type === 'diamond') {
				const midX = (element.x1 + element.x2) / 2;
				const midY = (element.y1 + element.y2) / 2;
				svgContent += `<polygon points="${midX},${element.y1} ${element.x2},${midY} ${midX},${element.y2} ${element.x1},${midY}" stroke="${strokeColor}" stroke-width="2" fill="none" />`;
			} else if (element.type === 'circle') {
				const radius = Math.sqrt(Math.pow(element.x2 - element.x1, 2) + Math.pow(element.y2 - element.y1, 2));
				svgContent += `<circle cx="${element.x1}" cy="${element.y1}" r="${radius}" stroke="${strokeColor}" stroke-width="2" fill="none" />`;
			} else if (element.type === 'text') {
				if (element.text) {
					const lines = element.text.split('\n');
					lines.forEach((line, index) => {
						svgContent += `<text x="${element.x1}" y="${element.y1 + index * 24}" font-family="sans-serif" font-size="24px" fill="${strokeColor}" dominant-baseline="text-before-edge">${escapeXml(line)}</text>`;
					});
				}
			} else if (element.type === 'pencil') {
				if (element.points && element.points.length > 0) {
					let d = `M ${element.points[0].x} ${element.points[0].y}`;
					for (let i = 1; i < element.points.length; i++) {
						d += ` L ${element.points[i].x} ${element.points[i].y}`;
					}
					svgContent += `<path d="${d}" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />`;
				}
			}
		});

		svgContent += `</g></svg>`;
		return svgContent;
	}

	function handleExportPng() {
		const a = document.createElement("a");
		a.href = previewDataUrl;
		a.download = `board-${boardId}.png`;
		a.click();
	}

	function handleExportSvg() {
		const svgContent = generateSvgContent();
		const blob = new Blob([svgContent], { type: "image/svg+xml" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `board-${boardId}.svg`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function handleCopyToClipboard() {
		try {
			const response = await fetch(previewDataUrl);
			const blob = await response.blob();
			await navigator.clipboard.write([
				new ClipboardItem({ [blob.type]: blob })
			]);
			toast.add({ title: "Copied to clipboard!", type: "success" });
		} catch (err) {
			console.error("Failed to copy", err);
			toast.add({ title: "Failed to copy to clipboard. Ensure HTTPS or localhost.", type: "error" });
		}
	}

	const memberList = (presence.length > 0 ? presence : (liveSession?.participants ?? [])).map((participant, index) => ({
		id: "id" in participant ? participant.id : `${participant.name}-${index}`,
		name: participant.name,
	}));

	return (
		<div className="flex flex-col items-center font-sans h-screen relative">
			<ProjectSidebar
				onExport={handleExport}
				onImport={handleImport}
				onReset={handleReset}
				onExportImage={handleExportImageRequest}
				onStartSession={handleStartSession}
				onJoinSession={handleJoinSession}
				onStopSession={handleStopSession}
				liveSession={liveSession}
				presence={presence}
				connectionStatus={connectionStatus}
				sessionName={sessionUserName}
				isSessionDialogOpen={isSessionDialogOpen}
				onSessionDialogOpenChange={setIsSessionDialogOpen}
				onSessionNameChange={(value) => {
					const nextName = value.trim() || "Guest";
					setSessionUserName(nextName);
				}}
			/>
			<div className="fixed right-4 top-4 z-50 flex items-center gap-2">
				{liveSession && connectionStatus === "connected" ? (
					<Button
						variant="destructive"
						size="sm"
						className="shadow-sm"
						onClick={handleStopSession}
					>
						Stop session
					</Button>
				) : (
					<Button
						variant="outline"
						size="sm"
						className="bg-card/90 shadow-sm backdrop-blur-sm"
						onClick={() => setIsSessionDialogOpen(true)}
					>
						<HugeiconsIcon icon={UserGroupIcon} className="mr-2 h-4 w-4" />
						Live Session
					</Button>
				)}
				{liveSession ? (
					<DropdownMenu>
						<DropdownMenuTrigger className="flex items-center rounded-full border border-border bg-card/90 px-2 py-1.5 shadow-sm backdrop-blur-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
							<div className="flex -space-x-2">
								{memberList.slice(0, 3).map((participant) => (
									<Avatar key={participant.id} className="h-7 w-7 border-2 border-background bg-muted text-[10px] font-semibold text-foreground">
										<AvatarFallback>{participant.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "U"}</AvatarFallback>
									</Avatar>
								))}
							</div>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-52 p-1">
							{memberList.length > 0 ? (
								memberList.slice(0, 8).map((participant) => (
									<DropdownMenuItem key={participant.id} className="gap-2 cursor-pointer">
										<Avatar className="h-7 w-7 border border-background bg-muted text-[10px] font-semibold text-foreground">
											<AvatarFallback>{participant.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "U"}</AvatarFallback>
										</Avatar>
										<span className="truncate">{participant.name}</span>
									</DropdownMenuItem>
								))
							) : (
								<div className="px-3 py-2 text-sm text-muted-foreground">No members yet</div>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}
			</div>
			<ProjectToolbar action={action} setAction={setAction} />
			<CanvasWrapper
				canvasRef={canvasRef}
				handleMouseUp={handleMouseUp}
				handleMouseDown={handleMouseDown}
				handleMouseMove={handleMouseMove}
				presence={presence}
				panOffset={panOffset}
				socketId={socketId ?? undefined}
			/>
			{editingElementId && (
				<TextEditorOverlay
					element={elements.find(el => el.id === editingElementId)}
					panOffset={panOffset}
					textInputValue={textInputValue}
					setTextInputValue={setTextInputValue}
					onBlur={(e) => handleTextBlur(e, editingElementId)}
				/>
			)}
			<ExportImageDialog
				isOpen={isExportModalOpen}
				onClose={() => setIsExportModalOpen(false)}
				onExportPng={handleExportPng}
				onExportSvg={handleExportSvg}
				onCopyToClipboard={handleCopyToClipboard}
				previewDataUrl={previewDataUrl}
			/>
		</div>
	);
}

function TextEditorOverlay({
	element,
	panOffset,
	textInputValue,
	setTextInputValue,
	onBlur
}: {
	element: BoardElement | undefined;
	panOffset: { x: number, y: number };
	textInputValue: string;
	setTextInputValue: (val: string) => void;
	onBlur: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
}) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useLayoutEffect(() => {
		if (textareaRef.current) {
			const el = textareaRef.current;
			setTimeout(() => {
				el.focus();
				el.select();
			}, 10);
		}
	}, []);

	if (!element) return null;

	return (
		<textarea
			ref={textareaRef}
			value={textInputValue}
			onChange={(e) => setTextInputValue(e.target.value)}
			onBlur={onBlur}
			style={{
				position: "absolute",
				left: element.x1 + panOffset.x,
				top: element.y1 + panOffset.y,
				margin: 0,
				padding: "4px",
				border: "1px dashed #000",
				outline: "none",
				resize: "none",
				overflow: "hidden",
				whiteSpace: "pre",
				background: "#fff",
				font: "24px sans-serif",
				color: "#000",
				lineHeight: "1",
				minHeight: "24px",
				width: Math.max(100, textInputValue.length * 15 + 20) + "px",
				height: (textInputValue.split('\n').length * 24 + 20) + "px",
				zIndex: 100
			}}
		/>
	);
}

function CanvasWrapper({
	canvasRef,
	handleMouseUp,
	handleMouseDown,
	handleMouseMove,
	presence,
	panOffset,
	socketId,
}: {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	handleMouseUp: () => void;
	handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	presence?: CollaborationPresence[];
	panOffset?: { x: number; y: number };
	socketId?: string;
}) {
	const { settings } = useCanvasSettings();
	const remoteCursors = (presence ?? []).filter((cursor) => cursor.id !== socketId && cursor.connected);

	return (
		<div className="relative w-full flex-1" style={{ backgroundColor: settings.background }}>
			<canvas
				className="w-full h-full"
				ref={canvasRef}
				onMouseUp={handleMouseUp}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
			/>
			<div className="pointer-events-none absolute inset-0 z-10">
				{remoteCursors.map((cursor) => (
					<div
						key={cursor.id}
						className="absolute -translate-x-1/2 -translate-y-1/2"
						style={{ left: cursor.x + (panOffset?.x ?? 0), top: cursor.y + (panOffset?.y ?? 0) }}
					>
						<div className="flex items-center gap-2">
							<span className="h-3.5 w-3.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: cursor.color }} />
							<span className="rounded-full border border-border bg-background/90 px-1.5 py-0.5 text-[10px] text-foreground shadow-sm">
								{cursor.name}
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function getElementBounds(element: { x1: number, y1: number, x2: number, y2: number, type: string, points: Array<{ x: number, y: number }>, text?: string }) {
	if (element.type === 'text') {
		const textWidth = element.text ? Math.max(50, element.text.length * 15) : 50;
		const textHeight = element.text ? element.text.split('\n').length * 24 : 24;
		return {
			minX: element.x1,
			minY: element.y1,
			maxX: element.x1 + textWidth,
			maxY: element.y1 + textHeight,
		};
	}

	if (element.type === 'pencil' && element.points.length > 0) {
		const xValues = element.points.map((point) => point.x);
		const yValues = element.points.map((point) => point.y);
		return {
			minX: Math.min(...xValues),
			minY: Math.min(...yValues),
			maxX: Math.max(...xValues),
			maxY: Math.max(...yValues),
		};
	}

	if (element.type === 'circle') {
		const radius = Math.sqrt(Math.pow(element.x2 - element.x1, 2) + Math.pow(element.y2 - element.y1, 2));
		return {
			minX: element.x1 - radius,
			minY: element.y1 - radius,
			maxX: element.x1 + radius,
			maxY: element.y1 + radius,
		};
	}

	return {
		minX: Math.min(element.x1, element.x2),
		minY: Math.min(element.y1, element.y2),
		maxX: Math.max(element.x1, element.x2),
		maxY: Math.max(element.y1, element.y2),
	};
}

function isPointNearElement(x: number, y: number, element: { x1: number, y1: number, x2: number, y2: number, type: string, points: Array<{ x: number, y: number }>, text?: string }): boolean {
	const threshold = 10;
	if (element.type === 'text') {
		const textWidth = element.text ? Math.max(50, element.text.length * 15) : 50;
		const textHeight = element.text ? element.text.split('\n').length * 24 : 24;
		return x >= element.x1 - threshold && x <= element.x1 + textWidth + threshold && y >= element.y1 - threshold && y <= element.y1 + textHeight + threshold;
	}
	if (element.type === 'pencil') {
		if (!element.points) return false;
		for (let i = 0; i < element.points.length - 1; i++) {
			if (isPointNearLine(x, y, element.points[i].x, element.points[i].y, element.points[i + 1].x, element.points[i + 1].y, threshold)) {
				return true;
			}
		}
		return false;
	}
	if (element.type === 'line' || element.type === 'arrow') {
		return isPointNearLine(x, y, element.x1, element.y1, element.x2, element.y2, threshold);
	}
	if (element.type === 'square') {
		return isPointNearLine(x, y, element.x1, element.y1, element.x2, element.y1, threshold) ||
			isPointNearLine(x, y, element.x2, element.y1, element.x2, element.y2, threshold) ||
			isPointNearLine(x, y, element.x2, element.y2, element.x1, element.y2, threshold) ||
			isPointNearLine(x, y, element.x1, element.y2, element.x1, element.y1, threshold);
	}
	if (element.type === 'diamond') {
		const midX = (element.x1 + element.x2) / 2;
		const midY = (element.y1 + element.y2) / 2;
		return isPointNearLine(x, y, midX, element.y1, element.x2, midY, threshold) ||
			isPointNearLine(x, y, element.x2, midY, midX, element.y2, threshold) ||
			isPointNearLine(x, y, midX, element.y2, element.x1, midY, threshold) ||
			isPointNearLine(x, y, element.x1, midY, midX, element.y1, threshold);
	}
	if (element.type === 'circle') {
		const radius = Math.sqrt(Math.pow(element.x2 - element.x1, 2) + Math.pow(element.y2 - element.y1, 2));
		const dist = Math.sqrt(Math.pow(x - element.x1, 2) + Math.pow(y - element.y1, 2));
		return dist >= radius - threshold && dist <= radius + threshold;
	}
	return false;
}

function isPointNearLine(px: number, py: number, x1: number, y1: number, x2: number, y2: number, threshold: number): boolean {
	const A = px - x1;
	const B = py - y1;
	const C = x2 - x1;
	const D = y2 - y1;
	const dot = A * C + B * D;
	const lenSq = C * C + D * D;
	let param = -1;
	if (lenSq !== 0) param = dot / lenSq;

	let xx, yy;

	if (param < 0) {
		xx = x1;
		yy = y1;
	} else if (param > 1) {
		xx = x2;
		yy = y2;
	} else {
		xx = x1 + param * C;
		yy = y1 + param * D;
	}

	const dx = px - xx;
	const dy = py - yy;
	return Math.sqrt(dx * dx + dy * dy) <= threshold;
}

function escapeXml(unsafe: string) {
	return unsafe.replace(/[<>&'"]/g, function (c) {
		switch (c) {
			case '<': return '&lt;';
			case '>': return '&gt;';
			case '&': return '&amp;';
			case '\'': return '&apos;';
			case '"': return '&quot;';
			default: return c;
		}
	});
}

function getContrastingStrokeColor(background: string, resolvedTheme: "dark" | "light") {
	const hex = background.trim().replace(/^#/, "");
	const normalizedHex = hex.length === 3
		? hex.split("").map((channel) => channel + channel).join("")
		: hex;
	if (!/^[\da-f]{6}$/i.test(normalizedHex)) {
		return resolvedTheme === "dark" ? "#ffffff" : "#000000";
	}

	const red = parseInt(normalizedHex.slice(0, 2), 16);
	const green = parseInt(normalizedHex.slice(2, 4), 16);
	const blue = parseInt(normalizedHex.slice(4, 6), 16);
	const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

	return luminance > 0.5 ? "#000000" : "#ffffff";
}

function isBoardElement(el: unknown): el is BoardElement {
	if (typeof el !== 'object' || el === null) return false;
	const element = el as Record<string, unknown>;
	if (typeof element.id !== 'number' || !Number.isFinite(element.id) || typeof element.type !== 'string') return false;
	if (typeof element.x1 !== 'number' || !Number.isFinite(element.x1) || typeof element.y1 !== 'number' || !Number.isFinite(element.y1) || typeof element.x2 !== 'number' || !Number.isFinite(element.x2) || typeof element.y2 !== 'number' || !Number.isFinite(element.y2)) return false;
	if (element.points) {
		if (!Array.isArray(element.points)) return false;
		for (const pt of element.points) {
			if (typeof pt !== 'object' || pt === null) return false;
			const point = pt as Record<string, unknown>;
			if (typeof point.x !== 'number' || !Number.isFinite(point.x) || typeof point.y !== 'number' || !Number.isFinite(point.y)) return false;
		}
	}
	if (element.type === 'pencil' && (!Array.isArray(element.points) || element.points.length === 0)) return false;
	return true;
}

