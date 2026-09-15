import { getDefaultBoard } from "@/actions/board";
import { BoardClient } from "./board-client";

export const dynamic = 'force-dynamic';

export default async function Home() {
	const board = await getDefaultBoard();

	let initialElements = [];
	try {
		if (Array.isArray(board.elements)) {
			initialElements = board.elements as unknown[];
		} else if (typeof board.elements === 'string') {
			initialElements = JSON.parse(board.elements);
		}
	} catch (e) {
		console.error("Failed to parse board elements", e);
	}

	return <BoardClient initialElements={initialElements} boardId={board.id} />;
}
