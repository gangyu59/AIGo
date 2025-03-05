var Board = (function() {
    var EMPTY = 0, BLACK = 1, WHITE = 2;

    function Board(size) {
        this.size = size;
        this.grid = Array.from({ length: size }, () => Array(size).fill(EMPTY));
    }

    // 复制棋盘
    Board.prototype.clone = function() {
        var newBoard = new Board(this.size);
        for (var r = 0; r < this.size; r++) {
            for (var c = 0; c < this.size; c++) {
                newBoard.grid[r][c] = this.grid[r][c];
            }
        }
        return newBoard;
    };

    // 检查坐标是否在棋盘内
    Board.prototype.inBounds = function(row, col) {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    };

    // 获取棋盘上的合法落子点
    Board.prototype.getLegalMoves = function(color) {
        var moves = [];
        for (var r = 0; r < this.size; r++) {
            for (var c = 0; c < this.size; c++) {
                if (this.isLegalMove(color, r, c)) {
                    moves.push({ row: r, col: c });
                }
            }
        }
				// console.log(`合法落子点 (${color === Board.BLACK ? "黑" : "白"}):`, moves);
	
        return moves;
    };

    // 判断是否是合法的落子点（防止重复落子、自杀、气数为 0）
    Board.prototype.isLegalMove = function(color, row, col) {
        if (!this.inBounds(row, col) || this.grid[row][col] !== EMPTY) {
            return false;
        }
        var testBoard = this.clone();
        testBoard.grid[row][col] = color;
        var groupInfo = testBoard.getGroupAndLiberties(row, col);
        return groupInfo.liberties > 0;
    };

    // 落子并更新棋盘（包括吃子逻辑）
    Board.prototype.playMove = function(color, row, col) {
        if (!this.isLegalMove(color, row, col)) {
            console.warn(`playMove() 失败：非法落子 row=${row}, col=${col}`);
            return false;
        }

        this.grid[row][col] = color;
        let opponent = (color === BLACK) ? WHITE : BLACK;
        let directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        let capturedStones = [];

        // 检查周围的对方棋子是否被提子（没有气）
        for (let i = 0; i < directions.length; i++) {
            let nr = row + directions[i][0];
            let nc = col + directions[i][1];
            if (this.inBounds(nr, nc) && this.grid[nr][nc] === opponent) {
                let oppGroup = this.getGroupAndLiberties(nr, nc);
                if (oppGroup.liberties === 0) {
                    capturedStones = capturedStones.concat(oppGroup.stones);
                }
            }
        }

        // 如果有被提的棋子，移除它们
        if (capturedStones.length > 0) {
            for (let s of capturedStones) {
                this.grid[s.row][s.col] = EMPTY;
            }
        }

        // 检查自己的棋子是否自杀（无气）
        let myGroup = this.getGroupAndLiberties(row, col);
        if (myGroup.liberties === 0) {
            console.warn(`playMove() 自杀：撤回 row=${row}, col=${col}`);
            this.grid[row][col] = EMPTY;
            return false;
        }

        return true;
    };

    // 计算指定位置的棋子属于哪个棋群，并计算其气数
    Board.prototype.getGroupAndLiberties = function(row, col) {
        let color = this.grid[row][col];
        if (color === EMPTY) return { stones: [], liberties: 0 };

        let visited = new Set();
        let liberties = new Set();
        let stack = [{ row, col }];
        let stones = [];

        while (stack.length > 0) {
            let { row, col } = stack.pop();
            let key = row + "," + col;
            if (visited.has(key)) continue;
            visited.add(key);
            stones.push({ row, col });

            let directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            for (let i = 0; i < directions.length; i++) {
                let nr = row + directions[i][0];
                let nc = col + directions[i][1];
                let nkey = nr + "," + nc;

                if (this.inBounds(nr, nc)) {
                    if (this.grid[nr][nc] === EMPTY) {
                        liberties.add(nkey);
                    } else if (this.grid[nr][nc] === color && !visited.has(nkey)) {
                        stack.push({ row: nr, col: nc });
                    }
                }
            }
        }

        return { stones: stones, liberties: liberties.size };
    };

    // 判断游戏是否结束（双方无合法落子）
    Board.prototype.isGameOver = function() {
        return this.getLegalMoves(BLACK).length === 0 && this.getLegalMoves(WHITE).length === 0;
    };

    // 计算当前棋盘上哪一方占据更多棋子（简单胜负判定）
    Board.prototype.getWinner = function() {
        let blackCount = 0, whiteCount = 0;
        for (var r = 0; r < this.size; r++) {
            for (var c = 0; c < this.size; c++) {
                if (this.grid[r][c] === BLACK) blackCount++;
                else if (this.grid[r][c] === WHITE) whiteCount++;
            }
        }
        if (blackCount > whiteCount) return BLACK;
        if (whiteCount > blackCount) return WHITE;
        return 0; // 平局
    };

    return {
        Board: Board,
        EMPTY: EMPTY,
        BLACK: BLACK,
        WHITE: WHITE
    };
})();