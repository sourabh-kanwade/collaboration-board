import { BoardClient } from "../components/editor/board-client";

export const dynamic = 'force-dynamic';

export default function Home() {
	return <BoardClient initialElements={[]} boardId="" />;
}
