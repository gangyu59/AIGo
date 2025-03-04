var Util = (function () {
  var BOARD_SIZE = 19; 
  var BLACK = 1, WHITE = 2, EMPTY = 0;

  // 简易封装POST请求
  function httpPost(url, data, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        callback(JSON.parse(xhr.responseText));
      }
    };
    xhr.send(JSON.stringify(data));
  }

  // 切换"思考中"提示的显示/隐藏
  function showThinking(show) {
    var el = document.getElementById('thinking');
    if (!el) return;
    el.style.display = show ? 'block' : 'none';
  }

  // 这里也可放其他公共函数，如 countStones() etc.

  return {
    BOARD_SIZE: BOARD_SIZE,
    BLACK: BLACK,
    WHITE: WHITE,
    EMPTY: EMPTY,
    httpPost: httpPost,
    showThinking: showThinking  // ✅ 现在 showThinking 正确暴露了
  };

})();