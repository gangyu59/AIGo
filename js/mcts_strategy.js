var MCTSStrategy = (function() {
    // ====== 策略参数（可在文件头统一调整） ======
    const SIMULATE_STEPS = 150;                // 模拟最大步数（适当增大）
    const CAPTURE_BONUS_MULTIPLIER = 15;       // 吃子奖励
    const CONNECTION_BONUS = 8;                // 连接己方棋子奖励
    const EDGE_PENALTY_CORNER = -20;           // 角落惩罚
    const EDGE_PENALTY_SIDE = -10;            // 边缘惩罚
    const CENTER_BASE = 10;                    // 中心奖励基准
    const CENTER_MULTIPLIER = 0;               // 中心距离惩罚乘数
    const LIBERTY_REDUCTION_MULTIPLIER = 10;   // 减少对方气的奖励
    const SELF_LIBERTY_MULTIPLIER = 3;         // 己方气数奖励
    const TERRITORY_MULTIPLIER = 2;            // 占地盘的奖励系数
    const EYE_BONUS = 10;                      // 形成眼位（>=3个己方邻居）时的奖励
 		const KEY_POINT_BONUS = 200; // 关键点奖励
		const BLOCK_OPPONENT_BONUS = 5; // 阻止对手扩展的奖励
		const EXPAND_TERRITORY_BONUS = 15; // 扩展地盘的奖励
		const OPENING_BOOK = [
		    { row: 3, col: 3 }, // 星位
		    { row: 3, col: 15 }, // 星位
		    { row: 15, col: 3 }, // 星位
		    { row: 15, col: 15 }, // 星位
		    { row: 9, col: 9 } // 天元
		];

		function selectMoveWithOpeningBook(board, color) {
		    let availableMoves = OPENING_BOOK.filter(move => board.isLegalMove(color, move.row, move.col));
		    if (availableMoves.length > 0) {
		        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
		    }
		    return null;
		}
		
    // ===== 主入口：simulate(node) =====
function simulate(node) {
    let tempBoard = node.board.clone();
    let color = node.colorToMove;
    let passCount = 0;

    // 优先使用开局库
    let openingMove = selectMoveWithOpeningBook(tempBoard, color);
    if (openingMove) {
        tempBoard.playMove(color, openingMove.row, openingMove.col);
        color = switchColor(color);
    }

    for (let i = 0; i < SIMULATE_STEPS; i++) {
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

// 评估某一步落子好坏，返回分数
function evaluateMove(board, move, color) {
    let opponent = (color === Board.BLACK) ? Board.WHITE : Board.BLACK;

    // 克隆并落子
    let tempBoard = board.clone();
    tempBoard.playMove(color, move.row, move.col);

    // 如果落子后自己没气 => 自杀
    let selfLiberties = tempBoard.getGroupAndLiberties(move.row, move.col).liberties;
    if (selfLiberties === 0) return -Infinity;

    // 1) 吃子奖励
    let beforeCapture = countStones(board, opponent);
    let afterCapture = countStones(tempBoard, opponent);
    let captureBonus = (afterCapture < beforeCapture) 
        ? (beforeCapture - afterCapture) * CAPTURE_BONUS_MULTIPLIER 
        : 0;

    // 2) 连接己方棋子
    let connectionBonus = isNearOwnStones(board, move, color) ? CONNECTION_BONUS : 0;

    // 3) 减少对手气
    let opponentLibBefore = sumLiberties(board, opponent);
    let opponentLibAfter = sumLiberties(tempBoard, opponent);
    let libertyReduction = (opponentLibBefore - opponentLibAfter) * LIBERTY_REDUCTION_MULTIPLIER;

    // 4) 己方气数加成
    let selfLibertyBonus = selfLiberties * SELF_LIBERTY_MULTIPLIER;

    // 5) 中心偏好 & 边缘惩罚
    let boardSize = board.size;
    let isCorner = (
        (move.row === 0 && move.col === 0) ||
        (move.row === 0 && move.col === boardSize - 1) ||
        (move.row === boardSize - 1 && move.col === 0) ||
        (move.row === boardSize - 1 && move.col === boardSize - 1)
    );
    let isEdge = (
        (move.row === 0 || move.col === 0 ||
         move.row === boardSize - 1 || move.col === boardSize - 1) && !isCorner
    );

    let edgePenalty = 0;
    if (isCorner) {
        edgePenalty = EDGE_PENALTY_CORNER;
    } else if (isEdge) {
        edgePenalty = EDGE_PENALTY_SIDE;
    }

    let centerX = Math.floor(boardSize / 2);
    let centerY = Math.floor(boardSize / 2);
    let centerDist = Math.abs(move.row - centerX) + Math.abs(move.col - centerY);
    let centerBonus = CENTER_BASE - centerDist * CENTER_MULTIPLIER;

    // 6) 占地盘估算
    let territoryScore = estimateTerritory(tempBoard, move, color) * TERRITORY_MULTIPLIER;

    // 7) 形成眼位的奖励
    let eyeBonus = (isEyeShape(tempBoard, move, color)) ? EYE_BONUS : 0;

    // 8) 关键点奖励（如星位、天元）
    let keyPointBonus = isKeyPoint(move, boardSize) ? KEY_POINT_BONUS : 0;

    // 9) 阻止对手扩展
    let blockOpponentBonus = blocksOpponentExpansion(tempBoard, move, color) ? BLOCK_OPPONENT_BONUS : 0;

    // 10) 扩展地盘奖励
    let expandTerritoryBonus = expandsTerritory(tempBoard, move, color) ? EXPAND_TERRITORY_BONUS : 0;

    let totalScore = captureBonus 
                   + connectionBonus 
                   + centerBonus 
                   + edgePenalty 
                   + libertyReduction 
                   + selfLibertyBonus
                   + territoryScore
                   + eyeBonus
                   + keyPointBonus
                   + blockOpponentBonus
                   + expandTerritoryBonus;

									 
    return totalScore;
}

function isKeyPoint(move, boardSize) {
    let keyPoints = [
        { row: 3, col: 3 }, { row: 3, col: boardSize - 4 }, 
        { row: boardSize - 4, col: 3 }, { row: boardSize - 4, col: boardSize - 4 },
        { row: Math.floor(boardSize / 2), col: Math.floor(boardSize / 2) } // 天元
    ];
    return keyPoints.some(point => point.row === move.row && point.col === move.col);
}

function blocksOpponentExpansion(board, move, color) {
    let opponent = (color === Board.BLACK) ? Board.WHITE : Board.BLACK;
    let directions = [{r:-1,c:0},{r:1,c:0},{r:0,c:-1},{r:0,c:1}];
    return directions.some(d => {
        let nr = move.row + d.r, nc = move.col + d.c;
        return board.inBounds(nr, nc) && board.grid[nr][nc] === opponent;
    });
}

function expandsTerritory(board, move, color) {
    let directions = [{r:-1,c:0},{r:1,c:0},{r:0,c:-1},{r:0,c:1}];
    return directions.some(d => {
        let nr = move.row + d.r, nc = move.col + d.c;
        return board.inBounds(nr, nc) && board.grid[nr][nc] === Board.EMPTY;
    });
}

    // =========== 是否自杀 ===============
    function isSuicidalMove(board, move, color) {
        let tempBoard = board.clone();
        tempBoard.playMove(color, move.row, move.col);
        let { liberties } = tempBoard.getGroupAndLiberties(move.row, move.col);
        return liberties === 0;
    }

    // =========== 估算此落子对地盘的贡献 (简易) ===========
    function estimateTerritory(board, move, color) {
        let directions = [{r:-1,c:0},{r:1,c:0},{r:0,c:-1},{r:0,c:1}];
        let count = 0;
        for (let d of directions) {
            let nr = move.row + d.r, nc = move.col + d.c;
            if (board.inBounds(nr,nc) && board.grid[nr][nc] === Board.EMPTY) {
                count += 1; // 周围空格越多，地盘潜力越大
            }
        }
        return count;
    }

    // =========== 是否眼形：若落子点邻接己方 >=3 个 => 简易认为是眼 ===========
    function isEyeShape(board, move, color) {
        let directions = [{r:-1,c:0},{r:1,c:0},{r:0,c:-1},{r:0,c:1}];
        let sameColorCount = 0;
        for (let d of directions) {
            let nr = move.row + d.r, nc = move.col + d.c;
            if (board.inBounds(nr, nc) && board.grid[nr][nc] === color) {
                sameColorCount++;
            }
        }
        return sameColorCount >= 3;
    }

    // =========== 计算整盘上某颜色所有棋子的总气数 ===========
    function sumLiberties(board, color) {
        let sum = 0;
        let visited = new Set();
        for (let r = 0; r < board.size; r++) {
            for (let c = 0; c < board.size; c++) {
                if (board.grid[r][c] === color) {
                    let key = r + "," + c;
                    if (!visited.has(key)) {
                        let info = board.getGroupAndLiberties(r, c);
                        sum += info.liberties;
                        info.stones.forEach(s => visited.add(s.r + "," + s.c));
                    }
                }
            }
        }
        return sum;
    }

    // =========== 计算某颜色的棋子数 ===========
    function countStones(board, color) {
        let cnt = 0;
        for (let r = 0; r < board.size; r++) {
            for (let c = 0; c < board.size; c++) {
                if (board.grid[r][c] === color) cnt++;
            }
        }
        return cnt;
    }

    // =========== 判断落子点附近是否有己方棋子(连接奖励) ===========
    function isNearOwnStones(board, move, color) {
        let directions = [{r:-1,c:0},{r:1,c:0},{r:0,c:-1},{r:0,c:1}];
        return directions.some(d => {
            let nr = move.row + d.r, nc = move.col + d.c;
            return board.inBounds(nr, nc) && board.grid[nr][nc] === color;
        });
    }

    // =========== 切换颜色 ===========
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