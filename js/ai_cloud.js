// ai_cloud.js
var AI_Cloud = (function(){

  // 未来可改为GPT/DeepSeek
  // 这里以随机+模拟网络延迟为例
  function getNextMove(board, color, callback) {
    setTimeout(function(){
      var moves = board.getLegalMoves(color);
      if(moves.length===0){
        callback(null);
        return;
      }
      var rnd = Math.floor(Math.random()*moves.length);
      callback(moves[rnd]);
    }, 600);
  }

  return {
    getNextMove: getNextMove
  };
})();