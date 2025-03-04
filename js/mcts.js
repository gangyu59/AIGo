var MCTS = (function() {
    function search(rootNode, timeLimitMs) {
        if (!rootNode || !rootNode.board) {
            console.error("search() 失败：rootNode 或 board 为空");
            return null;
        }

        let endTime = Date.now() + timeLimitMs;
        let iterCount = 0;

        while (Date.now() < endTime && iterCount < 5000) {
            let promising = MCTSCore.selectPromisingNode(rootNode);
            if (!promising) continue;

            let nodeToExplore = MCTSCore.expandNode(promising);
            if (!nodeToExplore) continue;

            let winner = MCTSStrategy.simulate(nodeToExplore);
            MCTSCore.backpropagate(nodeToExplore, winner);

            iterCount++;
        }

        // **修复问题：如果 rootNode 没有子节点，则直接返回一个合法的未尝试落子**
        if (rootNode.children.length === 0) {
            console.warn("MCTS 搜索失败：无可用子节点，返回未尝试的合法落子");
            if (rootNode.unexpandedMoves.length > 0) {
                return rootNode.unexpandedMoves[0]; // 返回第一个可用落子
            }
            return null; // 没有可走步，返回 null
        }

        // 选择访问次数最多的子节点作为最佳落子
        let bestChild = rootNode.children.reduce((best, child) => {
            return (child.visitCount > (best ? best.visitCount : 0)) ? child : best;
        }, null);

        if (!bestChild) {
            console.error("search() 失败：无最佳着法");
            return null;
        }

        return bestChild.move;
    }

    return {
        search: search
    };
})();