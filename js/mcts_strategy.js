var MCTSStrategy = (function() {
    function simulate(node) {
        let tempBoard = node.board.clone();
        let color = node.colorToMove;
        let passCount = 0;

        for (let i = 0; i < 100; i++) {
            if (tempBoard.isGameOver()) break;

            let moves = tempBoard.getLegalMoves(color).filter(move => !isSuicidalMove(tempBoard, move, color));
            if (moves.length === 0) {
                passCount++;
                if (passCount >= 2) break;
                color = switchColor(color);
                continue;
            }

            passCount = 0;

            let bestMove = moves.reduce((best, move) => {
                let score = evaluateMove(tempBoard, move, color);
                return score > best.score ? { move, score } : best;
            }, { move: null, score: -Infinity });

            tempBoard.playMove(color, bestMove.move.row, bestMove.move.col);
            color = switchColor(color);
        }

        return tempBoard.getWinner();
    }

    function evaluateMove(board, move, color) {
        let opponent = color === Board.BLACK ? Board.WHITE : Board.BLACK;
        let captureBonus = 0, connectionBonus = 0, centerBonus = 0, edgePenalty = 0, libertyBonus = 0, selfLibertyBonus = 0;

        let tempBoard = board.clone();
        tempBoard.playMove(color, move.row, move.col);

        let selfLiberties = tempBoard.getGroupAndLiberties(move.row, move.col).liberties;
        if (selfLiberties === 0) return -Infinity;  // **避免 AI 选择自杀点**

        let beforeCapture = countStones(board, opponent);
        let afterCapture = countStones(tempBoard, opponent);

        if (afterCapture < beforeCapture) {
            captureBonus = (beforeCapture - afterCapture) * 15;
        }

        if (isNearOwnStones(board, move, color)) {
            connectionBonus = 8;
        }

        let opponentLibertiesBefore = sumLiberties(board, opponent);
        let opponentLibertiesAfter = sumLiberties(tempBoard, opponent);
        let libertyReduction = (opponentLibertiesBefore - opponentLibertiesAfter) * 10;

        selfLibertyBonus = selfLiberties * 3; // **鼓励 AI 落子到气多的地方**

        let boardSize = board.size;
        let isCorner = (move.row === 0 && move.col === 0) || (move.row === 0 && move.col === boardSize - 1) ||
                       (move.row === boardSize - 1 && move.col === 0) || (move.row === boardSize - 1 && move.col === boardSize - 1);

        let isEdge = (move.row === 0 || move.col === 0 || move.row === boardSize - 1 || move.col === boardSize - 1) && !isCorner;

        if (isCorner) {
            edgePenalty = -20;  // **大幅降低 AI 落子到角落的可能性**
        } else if (isEdge) {
            edgePenalty = -10;  // **降低 AI 落子到边上的可能性**
        }

        let centerDist = Math.abs(move.row - boardSize / 2) + Math.abs(move.col - boardSize / 2);
        centerBonus = 30 - centerDist * 2; // **中心位置更受青睐**

        return captureBonus + connectionBonus + centerBonus + edgePenalty + libertyReduction + selfLibertyBonus;
    }

    function isSuicidalMove(board, move, color) {
        let tempBoard = board.clone();
        tempBoard.playMove(color, move.row, move.col);
        let { liberties } = tempBoard.getGroupAndLiberties(move.row, move.col);
        return liberties === 0;
    }

    function sumLiberties(board, color) {
        let sum = 0;
        let visited = new Set();

        for (let r = 0; r < board.size; r++) {
            for (let c = 0; c < board.size; c++) {
                let key = `${r},${c}`;
                if (board.grid[r][c] === color && !visited.has(key)) {
                    let { liberties, stones } = board.getGroupAndLiberties(r, c);
                    sum += liberties;
                    stones.forEach(s => visited.add(`${s.r},${s.c}`));
                }
            }
        }
        return sum;
    }

    function countStones(board, color) {
        let count = 0;
        for (let r = 0; r < board.size; r++) {
            for (let c = 0; c < board.size; c++) {
                if (board.grid[r][c] === color) count++;
            }
        }
        return count;
    }

    function isNearOwnStones(board, move, color) {
        let directions = [{r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}];
        return directions.some(d => {
            let nr = move.row + d.r, nc = move.col + d.c;
            return board.inBounds(nr, nc) && board.grid[nr][nc] === color;
        });
    }

    function switchColor(c) {
        return c === Board.BLACK ? Board.WHITE : Board.BLACK;
    }

    return {
        simulate: simulate,
        evaluateMove: evaluateMove,
        sumLiberties: sumLiberties,
        countStones: countStones,
        isNearOwnStones: isNearOwnStones,
        switchColor: switchColor
    };
})();