var MCTSCore = (function() {
    function selectPromisingNode(node) {
        var current = node;
        while (current.children.length > 0) {
            current = current.children.reduce((best, child) => {
                return child.visitCount > best.visitCount ? child : best;
            }, current.children[0]);
        }
        return current;
    }

    function expandNode(node) {
        if (!node.unexpandedMoves || node.unexpandedMoves.length === 0) return null;

        while (node.unexpandedMoves.length > 0) {
            var move = node.unexpandedMoves.pop();
            var newBoard = node.board.clone();
            var success = newBoard.playMove(node.colorToMove, move.row, move.col);

            if (success) {
                var nextColor = node.colorToMove === Board.BLACK ? Board.WHITE : Board.BLACK;
                var child = new MCTSNode(newBoard, node, move, nextColor);
                node.children.push(child);
                return child;
            }
        }

        return null;
    }

    function backpropagate(node, winner) {
        while (node !== null) {
            node.visitCount++;
            if (winner === node.colorToMove) {
                node.winScore += 1;
            } else if (winner !== 0) {
                node.winScore -= 1;
            }
            node = node.parent;
        }
    }

    return { selectPromisingNode, expandNode, backpropagate };
})();