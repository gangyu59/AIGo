var Main = (function(){

  var canvas, ctx;
  var board;            
  var currentColor;     
  var boardSize = 9;       // 默认9x9
  var thinkingTime = 2000; // 默认2秒
  // aiMode 可选 "local" / "cloud"；这里默认本地AI
  var aiMode = "local";  

  function init() {
    // 页面加载后：获取Canvas、上下文
    canvas = document.getElementById("goBoard");
    ctx = canvas.getContext("2d");

    // 立即以默认值(9x9, 2秒)初始化
    // 以便用户打开就看到9x9棋盘
    initDefaultBoard();
    drawBoard();
    bindCanvasClick();
  }

  // 默认初始化 (9x9, 2秒), 不读下拉框
  function initDefaultBoard() {
    boardSize = 9;
    thinkingTime = 2000;

    resizeCanvas();
    board = new Board.Board(boardSize);
    currentColor = Board.BLACK;
  }

  // 如果用户修改了下拉框并点击"开始"，则用下拉框的值
  function newGame() {
    var sizeSelect = document.getElementById("boardSizeSelect");
    boardSize = parseInt(sizeSelect.value);

    var timeSelect = document.getElementById("timeSelect");
    var timeSec = parseInt(timeSelect.value);
    thinkingTime = timeSec * 1000;

    resizeCanvas();
    board = new Board.Board(boardSize);
    currentColor = Board.BLACK;

    drawBoard();
  }

  // 封装调Canvas大小
  function resizeCanvas() {
    var screenW = window.innerWidth;
    // 让Canvas占据约90%屏幕宽度
    var cvSize = Math.floor(screenW * 0.9);
    canvas.width = cvSize;
    canvas.height = cvSize;
  }

  // 绘制棋盘线和已有棋子
  function drawBoard() {
    var size = canvas.width;
    var gridSize = size / (boardSize + 1);

    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = "#333";

    for (var i = 1; i <= boardSize; i++) {
      // 横线
      ctx.beginPath();
      ctx.moveTo(gridSize, i * gridSize);
      ctx.lineTo(boardSize * gridSize, i * gridSize);
      ctx.stroke();

      // 纵线
      ctx.beginPath();
      ctx.moveTo(i * gridSize, gridSize);
      ctx.lineTo(i * gridSize, boardSize * gridSize);
      ctx.stroke();
    }

    // 画已落的棋子
    for (var r = 0; r < boardSize; r++) {
      for (var c = 0; c < boardSize; c++) {
        var stone = board.grid[r][c];
        if (stone !== Board.EMPTY) {
          drawStone(r, c, stone);
        }
      }
    }
  }

  function drawStone(row, col, color) {
    var size = canvas.width;
    var gridSize = size / (boardSize + 1);
    var x = (col + 1) * gridSize;
    var y = (row + 1) * gridSize;
    var radius = gridSize * 0.45;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2*Math.PI);
    ctx.fillStyle = (color === Board.BLACK)? "#000" : "#fff";
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.stroke();
  }

  // 绑定点击落子事件
  function bindCanvasClick() {
    canvas.onclick = function(e) {
      var rect = canvas.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var gridSize = canvas.width / (boardSize + 1);

      var col = Math.round(x / gridSize) - 1;
      var row = Math.round(y / gridSize) - 1;
      if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
        userMove(row, col);
      }
    };
  }

  // 用户落子
  function userMove(row, col) {
    if (!board.isLegalMove(currentColor, row, col)) {
      return;
    }
    board.playMove(currentColor, row, col);
    drawBoard();

    if (board.isGameOver()) {
      alertResult();
      return;
    }

    // 切换棋手
    currentColor = (currentColor === Board.BLACK)? Board.WHITE: Board.BLACK;

    // AI思考
    setTimeout(aiMove, 200);
  }

  function aiMove() {
		// show thinking
    Util.showThinking(true);
		
		// 让浏览器先渲染"思考中"再进行AI计算
    setTimeout(function(){
		
	    if (aiMode === "local") {
	      // 本地MCTS
	      var bestMove = AI_Local.getNextMove(board, currentColor, thinkingTime);
	      if (bestMove) {
	        board.playMove(currentColor, bestMove.row, bestMove.col);
	        drawBoard();
	
	        if (board.isGameOver()) {
	          alertResult();
	          return;
	        }
	        currentColor = (currentColor === Board.BLACK)? Board.WHITE: Board.BLACK;
	      }
	    } else if (aiMode === "cloud") {
	      // 云端 (随机/占位)
	      AI_Cloud.getNextMove(board, currentColor, function(move){
	        if (move) {
	          board.playMove(currentColor, move.row, move.col);
	          drawBoard();
	
	          if (board.isGameOver()) {
	            alertResult();
	            return;
	          }
	          currentColor = (currentColor === Board.BLACK)? Board.WHITE: Board.BLACK;
	        }
	      });
	    }
			
		// hide thinking
      Util.showThinking(false);
		}, 50);
  }

  // 弹窗告知结果
  function alertResult() {
    var winner = board.getWinner();
    if (winner === Board.BLACK) {
      alert("黑棋胜！");
    } else if (winner === Board.WHITE) {
      alert("白棋胜！");
    } else {
      alert("平局！");
    }
  }

  // 页面载入后自动初始化
  window.onload = init;

  return {
    newGame: newGame
  };
})();