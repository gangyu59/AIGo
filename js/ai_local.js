var AI_Local = (function() {

    function getNextMove(board, color, timeLimit) {
        if (!board) {
            console.error("getNextMove() 错误：board 为空");
            return null;
        }

        let rootNode = new MCTSNode(board, null, null, color);
        return MCTS.search(rootNode, timeLimit);
    }

    return { getNextMove: getNextMove };

})();