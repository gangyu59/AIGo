var MCTSNode = function(board, parent, move, colorToMove) {
    this.board = board.clone();
    this.parent = parent;
    this.move = move;
    this.colorToMove = colorToMove;
    this.children = [];
    this.visitCount = 0;
    this.winScore = 0;
    this.unexpandedMoves = board.getLegalMoves(colorToMove);
};

window.MCTSNode = MCTSNode;