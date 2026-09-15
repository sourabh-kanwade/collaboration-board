"use client";
import { ToggleGroupItem } from "@/components/ui/toggle-group";
import { ToggleGroup } from "@base-ui/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	MousePointer,
	Square,
	Circle,
	SolidLineFreeIcons,
	ArrowRight02Icon,
	PencilLine,
	TextIcon,
	EraserIcon,
} from "@hugeicons/core-free-icons";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { CanvasSettingsProvider, useCanvasSettings } from "@/components/editor/canvas-settings-provider";

export default function Home() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [action, setAction] = useState<string[]>(["select"]);
	const [elements, setElements] = useState<Array<{
		id: number,
		x1: number, y1: number, x2: number, y2: number, type: string, points: Array<{ x: number, y: number }>,
	}>>([])
	const [isDrawing, setIsDrawing] = useState(false);
	useEffect(() => {
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
		const draw = () => {
			context.fillStyle = "grey";
			context.fillRect(0, 0, 100, 100);
			console.log(canvas);
		}
		const resizeCanvas = () => {

			const parent = canvas.parentElement;
			canvas.width = parent?.clientWidth || 800;
			canvas.height = parent?.clientHeight || 800
			draw()
		}
		resizeCanvas();


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
		context.clearRect(0, 0, canvas.width, canvas.height);

		elements.forEach(element => {
			context.beginPath();
			context.strokeStyle = 'black';
			context.lineWidth = 2;
			context.lineCap = "round";
			context.lineJoin = "round";
			if (element.type === 'line') {
				context.moveTo(element.x1, element.y1)
				context.lineTo(element.x2, element.y2)
				context.stroke();
			} else if (element.type === 'square') {
				context.strokeRect(element.x1, element.y1,
					element.x2 - element.x1,
					element.y2 - element.y1
				);
			} else if (element.type === 'circle') {
				const radius = Math.sqrt(
					Math.pow(element.x2 - element.x1, 2) + Math.pow(element.y2 - element.y1, 2)
				);
				context.arc(element.x1, element.y1, radius, 0, 2 * Math.PI);
				context.stroke();
			} else if (element.type === 'text') {
				context.strokeText('', element.x1, element.y1)
			} else if (element.type === 'pencil') {
				context.moveTo(element.points[0].x, element.points[0].y);
				// Draw a line to every subsequent point
				for (let i = 1; i < element.points.length; i++) {
					context.lineTo(element.points[i].x, element.points[i].y);
				}
				context.stroke();
			}
		})
	}, [elements])
	function handleMouseUp() {

		setIsDrawing(false)
	}

	function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
		// console.log('mouse down', e);
		console.log({
			x: e.clientX,
			y: e.clientY,
			buttons: e.buttons, t: 'down'
		});
		const { offsetX, offsetY } = e.nativeEvent;
		let newElement;
		if (action[0] === 'pencil') {
			newElement = {
				id: Date.now(),
				type: action[0],
				x1: offsetX, y1: offsetY, x2: offsetX, y2: offsetY, points: [{
					x: offsetX, y: offsetY
				}
				]
			}
		} else {
			newElement = {
				id: Date.now(),
				type: action[0],
				x1: offsetX, y1: offsetY, x2: offsetX, y2: offsetY, points: []
			}
		}
		setElements((prevElements) => [...prevElements, newElement])
		setIsDrawing(true)

	}

	function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {

		if (!isDrawing) {
			return;
		}
		const { offsetX, offsetY } = e.nativeEvent;
		setElements((prevElements) => {
			const lastIndex = prevElements.length - 1;
			const lastElement = prevElements[lastIndex];

			// Create a copy of the elements array, updating only the ending coordinates of the current shape
			const elementsCopy = [...prevElements];

			if (lastElement.type === 'pencil') {
				const updatedPoints = [...lastElement.points, { x: offsetX, y: offsetY }];
				elementsCopy[lastIndex] = { ...lastElement, points: updatedPoints };
			} else {
				const updatedElement = { ...lastElement, x2: offsetX, y2: offsetY };
				elementsCopy[lastIndex] = updatedElement;
			}

			return elementsCopy;
		});


	}

	function handleMouseLeave(_e: React.MouseEvent<HTMLCanvasElement>) {

		// setIsDrawing(false)
	}




	return (
		<CanvasSettingsProvider>
			<div className="flex flex-col items-center font-sans h-screen relative">
				<ProjectSidebar />
				<ToggleGroup
					itemType="single"
					value={action}
					onValueChange={(val) => {
						if (val) setAction(val);
					}}
					className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-card p-1 rounded-lg border shadow-sm"
				>
					<ToggleGroupItem value="select" aria-label="Select">
						<HugeiconsIcon icon={MousePointer} />
					</ToggleGroupItem>
					<ToggleGroupItem value="square" aria-label="Square">
						<HugeiconsIcon icon={Square} />
					</ToggleGroupItem>
					<ToggleGroupItem value="circle" aria-label="Circle">
						<HugeiconsIcon icon={Circle} />
					</ToggleGroupItem>{" "}
					<ToggleGroupItem value="arrow" aria-label="Arrow">
						<HugeiconsIcon icon={ArrowRight02Icon} />
					</ToggleGroupItem>
					<ToggleGroupItem value="line" aria-label="Line">
						<HugeiconsIcon icon={SolidLineFreeIcons} />
					</ToggleGroupItem>
					<ToggleGroupItem value="pencil" aria-label="Pencil">
						<HugeiconsIcon icon={PencilLine} />
					</ToggleGroupItem>
					<ToggleGroupItem value="text" aria-label="Text">
						<HugeiconsIcon icon={TextIcon} />
					</ToggleGroupItem>
					<ToggleGroupItem value="eraser" aria-label="Eraser">
						<HugeiconsIcon icon={EraserIcon} />
					</ToggleGroupItem>
				</ToggleGroup>
				<CanvasWrapper
					canvasRef={canvasRef}
					handleMouseUp={handleMouseUp}
					handleMouseDown={handleMouseDown}
					handleMouseMove={handleMouseMove}
					handleMouseLeave={handleMouseLeave}
				/>
			</div>
		</CanvasSettingsProvider>
	);
}

function CanvasWrapper({
	canvasRef,
	handleMouseUp,
	handleMouseDown,
	handleMouseMove,
	handleMouseLeave,
}: {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	handleMouseUp: () => void;
	handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	handleMouseLeave: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}) {
	const { settings } = useCanvasSettings();

	return (
		<div className="w-full flex-1" style={{ backgroundColor: settings.background }}>
			<canvas
				className="w-full h-full"
				ref={canvasRef}
				onMouseUp={handleMouseUp}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
			/>
		</div>
	);
}
