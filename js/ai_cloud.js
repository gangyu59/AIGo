var AI_Cloud = (function () {
    const apiKey = 'sk-93fd99b22a6f4a03980eee3385bd5f17'; // 替换为你的 DeepSeek API 密钥
    const apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    let moveCache = {}; // 缓存落子建议

    async function getNextMove(board, color, callback) {
        let cacheKey = getCacheKey(board);
        if (moveCache[cacheKey]) {
            console.log("从缓存中获取落子建议");
            callback(moveCache[cacheKey]);
            return;
        }

        let boardState = boardToString(board);
        let colorStr = (color === Board.BLACK) ? "黑" : "白";
        let occupiedPoints = getOccupiedPoints(board);

        let timeout = 8000; // 8秒超时
        let timeoutHandle = setTimeout(() => {
            console.warn("DeepSeek API 响应超时，随机选择一个点");
            fallbackMove(board, color, callback);
        }, timeout);

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: "你是一个围棋 AI，帮助决策最佳落子点。" },
                        { 
                            role: 'user', 
                            content: `当前 ${board.size}×${board.size} 棋盘如下，${colorStr}子下一手：\n\n${boardState}\n\n
                            **规则与策略：**
                            1. 你必须 **只选择空白点**（以下坐标已被占据，不能落子：${occupiedPoints.join(", ")}）。
                            2. 围棋的目标是 **围地盘、活棋、围堵对方**，你需要考虑全局战略，而不仅是局部得失。
                            3. **活棋需要至少两个眼**，避免选择会被提子的死棋点。
                            4. **优先考虑以下策略**：
                               - **扩展地盘**：选择能够扩大自己地盘的落子点。
                               - **封锁对手**：选择能够阻止对手扩张的落子点。
                               - **连接棋子**：选择能够连接己方棋子的落子点，增强棋群的生存能力。
                               - **形成眼位**：选择能够帮助己方形成两个眼的落子点。
                            5. **请提供 3 个候选点**（按优先级排序），并解释每个落子的战略价值：
                               - 哪些是进攻手段？如何围堵对手？
                               - 哪些是防守手段？如何扩大自己地盘，形成活棋？
                               - 是否有合适的封锁、连接或扩张的机会？
                            
                            请按照 **JSON 格式** 返回，如：
                            \`\`\`json
                            {
                                "moves": [
                                    { "row": 3, "col": 4, "reason": "扩展中央控制" },
                                    { "row": 6, "col": 2, "reason": "防止对方扩张" },
                                    { "row": 5, "col": 5, "reason": "形成活棋，创造两个眼" }
                                ]
                            }
                            \`\`\`
                            `
                        }
                    ]
                })
            });

            clearTimeout(timeoutHandle);

            if (!response.ok) {
                console.error(`DeepSeek 请求失败: ${response.status}`);
                return fallbackMove(board, color, callback);
            }

            const data = await response.json();
            if (data.choices && data.choices.length > 0) {
                let responseText = data.choices[0].message.content;
                console.log("DeepSeek 返回的落子建议:", responseText);

                let moveList = parseMoves(responseText, board);
                if (moveList.length > 0) {
                    // 缓存结果
                    moveCache[cacheKey] = moveList[0];
                    callback(moveList[0]); // 选第一个合法的点
                } else {
                    console.warn("DeepSeek AI 选择了非法点，随机选择一个合法落子点");
                    fallbackMove(board, color, callback);
                }
            } else {
                console.warn("DeepSeek AI 未返回有效数据，随机选择一个点");
                fallbackMove(board, color, callback);
            }
        } catch (error) {
            console.error("DeepSeek AI 请求失败:", error);
            fallbackMove(board, color, callback);
        }
    }

    // 获取棋盘缓存键
    function getCacheKey(board) {
        return board.grid.map(row => row.join(",")).join("|");
    }

    // 获取已占据的点
    function getOccupiedPoints(board) {
        let occupied = [];
        for (let r = 0; r < board.size; r++) {
            for (let c = 0; c < board.size; c++) {
                if (board.grid[r][c] !== Board.EMPTY) {
                    occupied.push(`(${r},${c})`);
                }
            }
        }
        return occupied;
    }

    // 解析 DeepSeek 返回的落子点
    function parseMoves(responseText, board) {
        try {
            let jsonStart = responseText.indexOf('{');
            let jsonEnd = responseText.lastIndexOf('}') + 1;
            let jsonString = responseText.slice(jsonStart, jsonEnd);
            let parsedData = JSON.parse(jsonString);

            if (parsedData.moves && Array.isArray(parsedData.moves)) {
                let moves = parsedData.moves.map(move => ({ 
                    row: move.row, 
                    col: move.col, 
                    reason: move.reason 
                }));

                // 过滤掉非法点
                let validMoves = moves.filter(move => 
                    board.inBounds(move.row, move.col) && 
                    board.grid[move.row][move.col] === Board.EMPTY
                );

                // 对合法点进行优先级排序
                return prioritizeMoves(validMoves);
            }
        } catch (error) {
            console.warn("解析 DeepSeek 落子数据失败:", error);
        }
        return [];
    }

    // 对落子点进行优先级排序
    function prioritizeMoves(moves) {
        return moves.sort((a, b) => {
            let aScore = getMoveScore(a.reason);
            let bScore = getMoveScore(b.reason);
            return bScore - aScore; // 降序排列
        });
    }

    // 根据落子原因计算优先级分数
    function getMoveScore(reason) {
        if (reason.includes("扩展地盘")) return 3;
        if (reason.includes("封锁对手")) return 2;
        if (reason.includes("连接棋子")) return 1;
        if (reason.includes("形成眼位")) return 1;
        return 0;
    }

    // 随机选择一个合法落子点
    function fallbackMove(board, color, callback) {
        let moves = board.getLegalMoves(color);
        if (moves.length === 0) {
            callback(null);
        } else {
            let rnd = Math.floor(Math.random() * moves.length);
            callback(moves[rnd]);
        }
    }

    // 将棋盘状态转换为字符串
    function boardToString(board) {
        let symbols = { [Board.BLACK]: "X", [Board.WHITE]: "O", [Board.EMPTY]: "." };
        return board.grid.map(row => row.map(cell => symbols[cell]).join(" ")).join("\n");
    }

    return {
        getNextMove: getNextMove
    };
})();