(function () {
    "use strict";

    function Cell(x, y) {
        if (!(this instanceof Cell)) {
            return new Cell(x, y);
        }

        this.x = x;
        this.y = y;
        this.isBomb = false;
        this.count = 0;
        this.isUncovered = false;
        this.isFlagged = false;
        this.$element = $(['<td class="cell" data-x="', x, '" data-y="', y, '"></td>'].join(''));
    }

    Cell.prototype.explode = function () {
        if (!this.isBomb) { return; }

        this.isExploded = true;
        this.$element.addClass('exploded');
        this.$element.append('<span class="bomb"><i class="fa fa-bomb"></i></span>');
    };

    Cell.prototype.makeBomb = function () {
        this.isBomb = true;
    };

    Cell.prototype.increment = function () {
        if (this.isBomb) { return; }

        this.count++;
    };

    Cell.prototype.toggleFlag = function () {
        if (this.isUncovered) {
            return;
        }

        if (this.isFlagged) {
            this.isFlagged = false;
            this.isQuestionable = true;
            this.$element.find('.flag').remove();
            this.$element.append('<span class="question"><i class="fa fa-question"></i></span>');
        } else if (this.isQuestionable) {
            this.isQuestionable = false;
            this.$element.find('.question').remove();
        } else {
            this.isFlagged = true;
            this.$element.append('<span class="flag"><i class="fa fa-flag"></i></span>');
        }
    };

    function MineField(width, height, bombs) {
        if (!(this instanceof MineField)) {
            return new MineField(width, height, bombs);
        }

        this.grid = [],
        this.$element = $('#grid');
        this.width = width;
        this.height = height;
        this.bombs = bombs;
        this.isInit = false;
        this.inProgress = false;
    }

    MineField.prototype.get = function (x, y) {
        return this.grid[x] && this.grid[x][y];
    };

    MineField.prototype.onExplosion = function () {
        this.grid.forEach(function (row) {
            row.forEach(function (cell) {
                if (cell.isBomb) {
                    if (!cell.isExploded && !cell.isFlagged) {
                        cell.$element.addClass('uncovered');
                        cell.$element.empty();
                        cell.$element.append('<span class="bomb"><i class="fa fa-bomb"></i></span>');
                    }
                } else if (cell.isFlagged) {
                    cell.$element.addClass('uncovered');
                    cell.$element.empty();
                    cell.$element.append('<span class="wrong"><i class="fa fa-close"></i></span>');
                }
            }, this);
        }, this);

        var $restart = $('#restart');

        $restart.attr('class', 'btn btn-danger');
        $restart.html('<i class="fa fa-frown-o"></i>');

        this.end();
    };

    MineField.prototype.restart = function () {
        if (this.inProgress) {
            this.end();
        }

        setTimeout(function () {
            this.destroy();
            this.init();
        }.bind(this), 0);
    };

    MineField.prototype.end = function () {
        this.inProgress = false;
        this.unbind();

        clearInterval(this.intervalId);
    };

    MineField.prototype.uncover = function (x, y) {
        var cell = this.get(x, y);

        if (!cell || cell.isFlagged || cell.isQuestionable || cell.isUncovered) {
            return;
        }

        this.uncovered++;
        cell.isUncovered = true;
        cell.$element.addClass('uncovered');

        if (cell.isBomb) {
            cell.explode();
            this.onExplosion();
        } else if (cell.count > 0) {
            cell.$element.append('<span class="count count-' + cell.count + '">' + cell.count + '</span>');
        } else {
            this._exec(cell, function (neighbor) {
                this.uncover(neighbor.x, neighbor.y);
            });
        }

        this.checkVictory();
    };

    MineField.prototype.checkVictory = function () {
        var $restart = $('#restart');

        if (this.inProgress && this.flagged <= this.bombs && (this.uncovered + this.flagged === this.total)) {
            this.end();
            $restart.attr('class', 'btn btn-success');
            $restart.html('<i class="fa fa-fort-awesome"></i>');
        }
    };

    MineField.prototype._exec = function (cell, fn) {
        var neighbors = [
                this.get(cell.x - 1, cell.y - 1),
                this.get(cell.x, cell.y - 1),
                this.get(cell.x + 1, cell.y - 1),
                this.get(cell.x - 1, cell.y),
                this.get(cell.x + 1, cell.y),
                this.get(cell.x - 1, cell.y + 1),
                this.get(cell.x, cell.y + 1),
                this.get(cell.x + 1, cell.y + 1)
            ];

        neighbors.forEach(function (cell) {
            if (cell) {
                fn.call(this, cell);
            }
        }, this);
    };

    MineField.prototype._makeRandomBomb = function (x, y) {
        var num = Math.floor(Math.random() * (this.width * this.height)),
            cell = this.grid[num % this.height][Math.floor(num / this.height)];

        // if the randomly selected cell either matches the given coordinates, or
        // is already a bomb, abort and find a new cell to turn into a bomb
        if (($.isNumeric(x) && $.isNumeric(y) && cell.x === x && cell.y === y) || cell.isBomb) {
            return this._makeRandomBomb();
        }

        cell.makeBomb();

        this._exec(cell, function (neighbor) {
            neighbor.increment();
        });
    };

    MineField.prototype.init = function () {
        var x, y, i, cell, $row,
            $restart = $('#restart');

        for (x = 0; x < this.height; x++) {
            $row = $('<tr>');
            this.grid[x] = [];

            this.$element.append($row);

            for (y = 0; y < this.width; y++) {
                cell = new Cell(x, y);
                this.grid[x][y] = cell;

                $row.append(cell.$element);
            }
        }

        $restart.attr('class', 'btn btn-default');
        $restart.html('<i class="fa fa-smile-o"></i>');

        this.uncovered = 0;
        this.flagged = 0;
        this.total = this.height * this.width;
        this.ticks = -1;
        this.updateTimer();
        this.updateMineCounter();
        this.bind();

        this.isInit = true;

        return this;
    };

    MineField.prototype.updateMineCounter = function () {
        var count = this.bombs - this.flagged;

        if (count >= 0) {
            $('.mine-counter').text(this.bombs - this.flagged);
        } else {
            $('.mine-counter').text('???');
        }
    };

    MineField.prototype.destroy = function () {
        if (this.iProgress) {
            throw new Error('Please do not destroy the MineField while it is inProgress');
        }

        this.$element.empty();
        this.unbind();
        this.grid = [];
    };

    MineField.prototype.onUncoverClick = function (e) {
        var $td = $(e.currentTarget),
            x = +$td.attr('data-x'),
            y = +$td.attr('data-y');

        if (!this.inProgress) {
            this.start(x, y);
        }

        this.uncover(x, y);
    };

    MineField.prototype.start = function (x, y) {
        var i;
        
        for (i = 0; i < this.bombs; i++) this._makeRandomBomb(x, y);

        this.intervalId = setInterval(this.updateTimer.bind(this), 1000);
        this.ticks = 0;
        this.inProgress = true;
    };

    MineField.prototype.updateTimer = function () {
        this.ticks++;

        var minutes = Math.floor(this.ticks / 60),
            seconds = this.ticks % 60;

        minutes = minutes < 10 ? '0' + minutes : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;

        $('.timer').text(minutes + ':' + seconds);
    };

    MineField.prototype.onFlagClick = function (e) {
        e.preventDefault();

        var $td = $(e.target),
            x = +$td.attr('data-x'),
            y = +$td.attr('data-y'),
            cell = this.get(x, y),
            flagged = cell.isFlagged;

        cell.toggleFlag();

        if (flagged) {
            this.flagged--;
        } else if (cell.isFlagged) {
            this.flagged++;
        }

        this.updateMineCounter();
        this.checkVictory();
    };

    MineField.prototype.bind = function () {
        this.$element.on('click', 'td', this.onUncoverClick.bind(this));
        this.$element.on('contextmenu', 'td', this.onFlagClick.bind(this));
    };

    MineField.prototype.unbind = function () {
        this.$element.off('click', 'td');
        this.$element.off('contextmenu', 'td');
    };

    var field = new MineField(9, 9, 10).init();

    $('#restart').on('click', function (e) {
        field.restart();
    });

    $('.dropdown-menu').on('click', 'a', function (e) {
        e.preventDefault();

        var difficulty = $(e.currentTarget).attr('data-difficulty');

        switch (difficulty) {
            case 'beginner':
                field.width = 9;
                field.height = 9;
                field.bombs = 10;

                break;
            case 'intermediate':
                field.width = 16;
                field.height = 16;
                field.bombs = 40;

                break;
            case 'expert':
                field.width = 30;
                field.height = 16;
                field.bombs = 99;

                break;
        }

        field.restart();
    });
}());
