var MCTSCore = (function() {
    // 计算 UCT 分数
    function uctValue(parentVisits, node, explorationConstant) {
        if (node.visitCount === 0) {
            // 首次访问，给一个非常高的值，鼓励探索
            console.log(`UCT: 节点 (${node.move ? node.move.row : 'root'}, ${node.move ? node.move.col : 'root'}) 未被访问，返回 Infinity`);
            return Infinity;
        }
        let exploitation = node.winScore / node.visitCount;
        let exploration = explorationConstant * Math.sqrt(Math.log(parentVisits + 1) / node.visitCount);
        let uct = exploitation + exploration;
        console.log(`UCT: 节点 (${node.move.row}, ${node.move.col}) 利用值=${exploitation.toFixed(4)}, 探索值=${exploration.toFixed(4)}, UCT=${uct.toFixed(4)}`);
        return uct;
    }

    // 选择：使用 UCT 分数，沿着搜索树往下走，直到叶节点
    function selectPromisingNode(node) {
        let current = node;
        while (current.children.length > 0) {
            current = current.children.reduce((best, child) => {
                let uctA = uctValue(current.visitCount, child, 1.41);
                let uctB = uctValue(current.visitCount, best, 1.41);
                return uctA > uctB ? child : best;
            }, current.children[0]);

            if (current.move) {
                console.log(`selectPromisingNode: 选择节点 (${current.move.row}, ${current.move.col}), visitCount=${current.visitCount}`);
            } else {
                console.log("selectPromisingNode: 当前为 root 节点");
            }
        }
        return current;
    }

    // 扩展：在当前节点选择一个未尝试的落子点，创建新的子节点
    function expandNode(node) {
        // 如果没有未扩展的落子点，就无法扩展
        if (!node.unexpandedMoves || node.unexpandedMoves.length === 0) {
            console.warn("expandNode() 失败：无可用落子点！");
            return null;
        }

        // 对 unexpandedMoves 按距离中心的升序排序（中心优先）
        node.unexpandedMoves.sort((a, b) => {
            let center = node.board.size / 2;
            let distA = Math.abs(a.row - center) + Math.abs(a.col - center);
            let distB = Math.abs(b.row - center) + Math.abs(b.col - center);
            return distA - distB;  // 越小越靠近中心
        });

        console.log("expandNode() 排序后可用落子点:", 
            node.unexpandedMoves.map(m => `(${m.row},${m.col})`).join(", "));

        // 使用 shift()，取距离中心最近的点，而不是 pop()
        while (node.unexpandedMoves.length > 0) {
            let move = node.unexpandedMoves.shift(); 
            console.log(`expandNode(): 尝试扩展落子点 (${move.row}, ${move.col})`);

            let newBoard = node.board.clone();
            let success = newBoard.playMove(node.colorToMove, move.row, move.col);
            if (success) {
                let nextColor = (node.colorToMove === Board.BLACK) ? Board.WHITE : Board.BLACK;
                let child = new MCTSNode(newBoard, node, move, nextColor);
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

    // 回溯：将模拟结果回传到父节点，更新 visitCount 与 winScore
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