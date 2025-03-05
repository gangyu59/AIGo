var MCTSStrategy = (function() {
    // ===== 可调整的策略参数 =====
    const SIMULATE_STEPS = 100;                  // 模拟最大步数
    const CAPTURE_BONUS_MULTIPLIER = 15;           // 吃子奖励乘数
    const CONNECTION_BONUS = 8;                  // 连接己方棋子奖励
    const CENTER_BASE = 30;                      // 中心奖励基准值
    const CENTER_MULTIPLIER = 2;                 // 中心距离惩罚乘数（中心奖励 = CENTER_BASE - centerDist * CENTER_MULTIPLIER）
    const EDGE_PENALTY = -15;                    // 边角惩罚分（如果落在边角，加此负分）
    const LIBERTY_REDUCTION_MULTIPLIER = 10;       // 对手气数减少的奖励乘数
    const SELF_LIBERTY_MULTIPLIER = 3;             // 自己气数奖励乘数
    const TERRITORY_MULTIPLIER = 0;              // 围地奖励乘数（目前未使用，可调整）

    // ===== 模拟对局：在给定节点上随机模拟一局，并返回胜者（Board.BLACK / Board.WHITE / 0 平局） =====
    function simulate(node) {
        let tempBoard = node.board.clone();
        let color = node.colorToMove;
        let passCount = 0;

        for (let i = 0; i < SIMULATE_STEPS; i++) {
            if (tempBoard.isGameOver()) break;

            // 过滤掉自杀点
            let moves = tempBoard.getLegalMoves(color).filter(move => !isSuicidalMove(tempBoard, move, color));
            if (moves.length === 0) {
                passCount++;
                if (passCount >= 2) break;
                color = switchColor(color);
                continue;
            }

            passCount = 0;

            // 这里改为使用 shift()，确保从排序后的 unexpandedMoves 中取靠近中心的点（如果排序过的话）
            let bestMove = moves.reduce((best, move) => {
                let score = evaluateMove(tempBoard, move, color);
                return score > best.score ? { move, score } : best;
            }, { move: null, score: -Infinity });

            // 如果你希望模拟时完全随机，可以用以下代码代替上面的 reduce():
            // let randomMove = moves[Math.floor(Math.random() * moves.length)];
            // tempBoard.playMove(color, randomMove.row, randomMove.col);
            // 否则，使用评分选出最佳落子：
            tempBoard.playMove(color, bestMove.move.row, bestMove.move.col);

            color = switchColor(color);
        }

        return tempBoard.getWinner();
    }

    // ===== 评估一个落子点的好坏 =====
    function evaluateMove(board, move, color) {
        let opponent = color === Board.BLACK ? Board.WHITE : Board.BLACK;
        let captureBonus = 0, connectionBonus = 0, centerBonus = 0;
        let edgePenalty = 0, libertyReduction = 0, selfLibertyBonus = 0;

        let tempBoard = board.clone();
        tempBoard.playMove(color, move.row, move.col);

        // 计算自己这块棋的气数，若为 0 则直接返回极低分（自杀）
        let selfLiberties = tempBoard.getGroupAndLiberties(move.row, move.col).liberties;
        if (selfLiberties === 0) return -Infinity;
        selfLibertyBonus = selfLiberties * SELF_LIBERTY_MULTIPLIER;

        // 吃子奖励：比较落子前后对方棋子的数量
        let beforeCapture = countStones(board, opponent);
        let afterCapture = countStones(tempBoard, opponent);
        if (afterCapture < beforeCapture) {
            captureBonus = (beforeCapture - afterCapture) * CAPTURE_BONUS_MULTIPLIER;
        }

        // 连接己方棋子奖励
        if (isNearOwnStones(board, move, color)) {
            connectionBonus = CONNECTION_BONUS;
        }

        // 对手气数减少奖励
        let opponentLibertiesBefore = sumLiberties(board, opponent);
        let opponentLibertiesAfter = sumLiberties(tempBoard, opponent);
        libertyReduction = (opponentLibertiesBefore - opponentLibertiesAfter) * LIBERTY_REDUCTION_MULTIPLIER;

        // 中心奖励：计算 Manhattan 距离，并归一化到一定范围内
        let centerX = Math.floor(board.size / 2);
        let centerY = Math.floor(board.size / 2);
        let centerDist = Math.abs(move.row - centerX) + Math.abs(move.col - centerY);
        // 假设最大距离为 centerX + centerY
        let maxDist = centerX + centerY;
        centerBonus = (1 - centerDist / maxDist) * CENTER_BASE;

        // 边角惩罚：如果落在边界上
        if (move.row === 0 || move.col === 0 || move.row === board.size - 1 || move.col === board.size - 1) {
            edgePenalty = EDGE_PENALTY;
        }

        let totalScore = captureBonus + connectionBonus + centerBonus + edgePenalty + libertyReduction + selfLibertyBonus;
        return totalScore;
    }

    // ===== 判断一个落子是否自杀 =====
    function isSuicidalMove(board, move, color) {
        let tempBoard = board.clone();
        tempBoard.playMove(color, move.row, move.col);
        let { liberties } = tempBoard.getGroupAndLiberties(move.row, move.col);
        return liberties === 0;
    }

    // ===== 计算棋盘上指定颜色所有棋群的总气数 =====
    function sumLiberties(board, color) {
        let sum = 0;
        let visited = new Set();
        for (let r = 0; r < board.size; r++) {
            for (let c = 0; c < board.size; c++) {
                let key = r + "," + c;
                if (board.grid[r][c] === color && !visited.has(key)) {
                    let groupInfo = board.getGroupAndLiberties(r, c);
                    sum += groupInfo.liberties;
                    groupInfo.stones.forEach(s => visited.add(s.row + "," + s.col));
                }
            }
        }
        return sum;
    }

    // ===== 计算棋盘上指定颜色棋子的数量 =====
    function countStones(board, color) {
        let count = 0;
        for (let r = 0; r < board.size; r++) {
            for (let c = 0; c < board.size; c++) {
                if (board.grid[r][c] === color) count++;
            }
        }
        return count;
    }

    // ===== 判断落子点周围是否有己方棋子 =====
    function isNearOwnStones(board, move, color) {
        let directions = [{r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}];
        return directions.some(d => {
            let nr = move.row + d.r, nc = move.col + d.c;
            return board.inBounds(nr, nc) && board.grid[nr][nc] === color;
        });
    }

    // ===== 切换颜色 =====
    function switchColor(c) {
        return c === Board.BLACK ? Board.WHITE : Board.BLACK;
    }

    return {
        simulate: simulate,
        evaluateMove: evaluateMove,
        isSuicidalMove: isSuicidalMove,
        sumLiberties: sumLiberties,
        countStones: countStones,
        isNearOwnStones: isNearOwnStones,
        switchColor: switchColor
    };
})();