var MCTSCore = (function() {
    // 计算 UCT 评分：如果节点未访问，返回 Infinity；否则返回 (win/visit) + exploration
    function uctValue(parentVisits, node, explorationConstant) {
        if (node.visitCount === 0) {
            console.log(`UCT: 节点 (${node.move ? node.move.row : 'root'}, ${node.move ? node.move.col : 'root'}) 未被访问，返回 Infinity`);
            return Infinity;
        }
        let exploitation = node.winScore / node.visitCount;
        let exploration = explorationConstant * Math.sqrt(Math.log(parentVisits + 1) / node.visitCount);
        let uct = exploitation + exploration;
        console.log(`UCT: 节点 (${node.move.row}, ${node.move.col}) 利用值: ${exploitation.toFixed(4)}, 探索值: ${exploration.toFixed(4)}, 总分: ${uct.toFixed(4)}`);
        return uct;
    }

    // 选择最有潜力的节点，基于 UCT 评分
    function selectPromisingNode(node) {
        var current = node;
        while (current.children.length > 0) {
            current = current.children.reduce((best, child) => {
                let childUCT = uctValue(current.visitCount, child, 1.41);
                let bestUCT = uctValue(current.visitCount, best, 1.41);
                return childUCT > bestUCT ? child : best;
            }, current.children[0]);
            if (current.move) {
                console.log(`selectPromisingNode: 当前选择节点 (${current.move.row}, ${current.move.col}), 访问次数: ${current.visitCount}`);
            } else {
                console.log(`selectPromisingNode: 当前为根节点`);
            }
        }
        return current;
    }

    // 扩展节点：从当前节点中尝试展开一个未扩展的合法落子点
    function expandNode(node) {
        if (!node.unexpandedMoves || node.unexpandedMoves.length === 0) {
            console.warn("expandNode() 失败：无可用落子点！");
            return null;
        }

        while (node.unexpandedMoves.length > 0) {
            var move = node.unexpandedMoves.pop();
            console.log(`expandNode(): 尝试扩展落子点 (${move.row}, ${move.col})`);
            var newBoard = node.board.clone();
            if (newBoard.playMove(node.colorToMove, move.row, move.col)) {
                var nextColor = (node.colorToMove === Board.BLACK) ? Board.WHITE : Board.BLACK;
                var child = new MCTSNode(newBoard, node, move, nextColor);
                node.children.push(child);
                console.log(`expandNode(): 成功扩展节点 (${move.row}, ${move.col})`);
                return child;
            } else {
                console.warn(`expandNode(): 落子点 (${move.row}, ${move.col}) 无法落子，尝试下一个`);
            }
        }
        console.warn("expandNode() 未能成功扩展任何子节点！");
        return null;
    }

    // 反向传播：将模拟结果回传到所有父节点
    function backpropagate(node, winner) {
        while (node !== null) {
            node.visitCount++;
            if (winner === node.colorToMove) {
                node.winScore++;
            } else if (winner !== 0) {
                node.winScore--;
            }
            console.log(`backpropagate: 节点 (${node.move ? node.move.row : 'root'}, ${node.move ? node.move.col : 'root'}) 更新后, visitCount=${node.visitCount}, winScore=${node.winScore}`);
            node = node.parent;
        }
    }

    return { 
        selectPromisingNode: selectPromisingNode, 
        expandNode: expandNode, 
        backpropagate: backpropagate, 
        uctValue: uctValue 
    };
})();