var AI_Local = (function() {

    function getNextMove(board, color, timeLimit) {
        if (!board) {
            console.error("getNextMove() 错误：board 为空");
            return null;
        }

        let rootNode = new MCTSNode(board, null, null, color);
        return MCTS.search(rootNode, timeLimit);
				
				/* **完全随机选择一个合法落子点**
				let legalMoves = board.getLegalMoves(color);
        if (legalMoves.length === 0) return null;

        let randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        return randomMove;
				*/
       
    }

    return { getNextMove: getNextMove };

})();