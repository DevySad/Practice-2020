var requestAnimFrame = (function(){
    return window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(callback){
            window.setTimeout(callback, 1000 / 60);
        };
})();

var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");
canvas.width = 512;
canvas.height = 480;
document.body.appendChild(canvas);

var lastTime;
function main() {
    var now = Date.now();
    var dt = (now - lastTime) / 1000.0;

    update(dt);
    render();

    lastTime = now;
    requestAnimFrame(main);
};

function init() {
    terrainPattern = ctx.createPattern(resources.get('img/terrain.png'), 'repeat');

    document.getElementById('play-again').addEventListener('click', function() {
        reset();
    });

    megalithInit();
    
    mannaInit();
    
    reset();
    lastTime = Date.now();
    main();
}

resources.load([
    'img/sprites.png',
    'img/terrain.png'
]);
resources.onReady(init);

var player = {
    pos: [0, 0],
    sprite: new Sprite('img/sprites.png', [0, 0], [39, 39], 16, [0, 1])
};

var bullets = [];
var enemies = [];
var explosions = [];
var megalith = [];
var manna = [];

var lastFire = Date.now();
var gameTime = 0;
var isGameOver;
var terrainPattern;

var score = 0;
var scoreEl = document.getElementById('score');

var scoreManna = 0;
var scoreMannaEl = document.getElementById('scoreManna');

var playerSpeed = 200;
var bulletSpeed = 500;
var enemySpeed = 100;


//Заменил повторяющийся код
function createManna()
{
    var mannaPos = [Math.floor(Math.random() * ((canvas.width - 100) + 1)) + 10,
        Math.floor(Math.random() * ((canvas.height - 100) + 1))];
    
    var mannaSize = [55, 45];  

    if (boxCollides([50, canvas.height / 2], player.sprite.size, mannaPos,
        mannaSize))
        return;

    for (var i = 0; i < megalith.length; i++)
    {
        var pos = megalith[i].pos;
        var size = megalith[i].sprite.size;

        if (boxCollides(pos, size, mannaPos, mannaSize))
        {
            return;
        }
    }

    return manna.push({
            pos: mannaPos,
            sprite: new Sprite('img/sprites.png', [0, 165], mannaSize, 5, [0, 1])
        });
}

function mannaInit() 
{
    while (manna.length < 3)
    {
        createManna();
    }
}

//Решил, что мегалит не может появиться на мегалите
function forEachMeg(pos)
{
    for (var i = 0; i < megalith.length; i++)
    {
        if (boxCollides(pos, megalith[i].sprite.size,
            megalith[i].pos, megalith[i].sprite.size)
            || (Math.abs(pos[0] - megalith[i].pos[0]) < 60)
            || (Math.abs(pos[1] - megalith[i].pos[1]) < 60))
        {
            return true;
        }
    }

    return false;
}

function megalithInit() 
{
    var megalithPos = []; 

    var megalithSize = [55, 45]; 

    while(megalith.length < 4)
    {
        megalithPos = [Math.floor(Math.random() * ((canvas.width - 130) + 1)) + 10,
            Math.floor(Math.random() * ((canvas.height - 130) + 1))];  

        if (boxCollides([50, canvas.height / 2], player.sprite.size, megalithPos, megalithSize)
            || forEachMeg(megalithPos))
        {
           continue;           
        }  
        
        megalith.push({
            pos: megalithPos,
            sprite: new Sprite('img/sprites.png', [0, 217], megalithSize, 0, [0, 1])
        });
    }
};

function update(dt) {
    gameTime += dt;

    handleInput(dt);
    updateEntities(dt);

    if(Math.random() < 1 - Math.pow(.993, gameTime)) {
        enemies.push({
            pos: [canvas.width,
                  Math.random() * (canvas.height - 39)],
            sprite: new Sprite('img/sprites.png', [0, 78], [80, 39],
                               6, [0, 1, 2, 3, 2, 1])
        });
    }

    if ((manna.length < 8) && (Math.random() < 1 - Math.pow(.993, gameTime)))
    {
        createManna();
    }

    checkCollisions();

    scoreEl.innerHTML = score;
    scoreMannaEl.innerHTML = scoreManna;
};

//Заменил повторяющийся код
function collideMegPlayer()
{
    for (var i = 0; i < megalith.length; i++)
    {
        var pos = megalith[i].pos;
        var size = megalith[i].sprite.size;

        if (boxCollides(player.pos, player.sprite.size, pos, size))
        {
            return pos;
        }
    }

    return false;
}

function handleInput(dt) {
    if(input.isDown('DOWN') || input.isDown('s')) {

        if ((collideMegPlayer()[1] > player.pos[1]))
            return;

        player.pos[1] += playerSpeed * dt;
    }

    if(input.isDown('UP') || input.isDown('w')) {

        if ((collideMegPlayer()[1] < player.pos[1]))
            return;

        player.pos[1] -= playerSpeed * dt;
    }

    if(input.isDown('LEFT') || input.isDown('a')) {


        if ((collideMegPlayer()[0] < player.pos[0]))
            return;

        player.pos[0] -= playerSpeed * dt;
    }

    if(input.isDown('RIGHT') || input.isDown('d')) {

        if ((collideMegPlayer()[0] > player.pos[0]))
            return;

        player.pos[0] += playerSpeed * dt;
    }

    if(input.isDown('SPACE') &&
       !isGameOver &&
       Date.now() - lastFire > 100) {
        var x = player.pos[0] + player.sprite.size[0] / 2;
        var y = player.pos[1] + player.sprite.size[1] / 2;

        bullets.push({ pos: [x, y],
                       dir: 'forward',
                       sprite: new Sprite('img/sprites.png', [0, 39], [18, 8]) });
        bullets.push({ pos: [x, y],
                       dir: 'up',
                       sprite: new Sprite('img/sprites.png', [0, 50], [9, 5]) });
        bullets.push({ pos: [x, y],
                       dir: 'down',
                       sprite: new Sprite('img/sprites.png', [0, 60], [9, 5]) });

        lastFire = Date.now();
    }
}

function updateEntities(dt) {
    player.sprite.update(dt);

    for(var i=0; i<bullets.length; i++) {
        var bullet = bullets[i];

        switch(bullet.dir) {
        case 'up': bullet.pos[1] -= bulletSpeed * dt; break;
        case 'down': bullet.pos[1] += bulletSpeed * dt; break;
        default:
            bullet.pos[0] += bulletSpeed * dt;
        }

        if(bullet.pos[1] < 0 || bullet.pos[1] > canvas.height ||
           bullet.pos[0] > canvas.width) {
            bullets.splice(i, 1);
            i--;
        }
    }

    for(var i=0; i<enemies.length; i++) {
        enemies[i].pos[0] -= enemySpeed * dt;
        enemies[i].sprite.update(dt);

        //Переделал обход мегалитов
        for (var k = 0; k < megalith.length; k++)
        {
            var pos3 = megalith[k].pos;
            var size3 = megalith[k].sprite.size;

            if (boxCollides([enemies[i].pos[0] - 50, enemies[i].pos[1]], 
                enemies[i].sprite.size, pos3, size3))
            {  
                 if (enemies[i].pos[1] > pos3[1] + 5)
                  enemies[i].pos[1] += enemySpeed * dt;
                 else
                   enemies[i].pos[1] -= enemySpeed * dt;  
              
            }
        }

        if(enemies[i].pos[0] + enemies[i].sprite.size[0] < 0) {
            enemies.splice(i, 1);
            i--;
        }
    }

    for(var l = 0; l < manna.length; l++)
    {
        manna[l].sprite.update(dt);
    }

    //Для отображения анимации при подборе манны не придумал ничего лучше,
    //кроме как создать сущность mannaEat
    for(var i=0; i<mannaEat.length; i++) {
        mannaEat[i].sprite.update(dt);

        if(mannaEat[i].sprite.done) {
            mannaEat.splice(i, 1);
            i--;
        }
    }

    for(var i=0; i<explosions.length; i++) {
        explosions[i].sprite.update(dt);

        if(explosions[i].sprite.done) {
            explosions.splice(i, 1);
            i--;
        }
    }
}

function collides(x, y, r, b, x2, y2, r2, b2) {
    return !(r <= x2 || x > r2 ||
             b <= y2 || y > b2);
}

function boxCollides(pos, size, pos2, size2) {
    return collides(pos[0], pos[1],
                    pos[0] + size[0], pos[1] + size[1],
                    pos2[0], pos2[1],
                    pos2[0] + size2[0], pos2[1] + size2[1]);
}

function createExplosion(pos)
{
    explosions.push({
        pos: pos,
        sprite: new Sprite('img/sprites.png',
                           [0, 117],
                           [39, 39],
                           16,
                           [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                           null,
                           true)
    });

}

var mannaEat = [];

function checkCollisions() {
    checkPlayerBounds();

    //Проверку подбора манны перенес в этот метод
    for (var l = 0; l < manna.length; l++)
    {
        var pos4 = manna[l].pos;
        var size4 = manna[l].sprite.size;

        if (boxCollides(player.pos, player.sprite.size, pos4, size4))
        {
            mannaEat.push({
                pos: pos4,
                sprite: new Sprite('img/sprites.png', [0, 165], size4, 5, [0, 1, 2, 3, 4],
                null, true)
            });
          
            manna.splice(l, 1);

            scoreManna += 1;

            break;
        }
    }
    
    for(var i=0; i<enemies.length; i++) {
        var pos = enemies[i].pos;
        var size = enemies[i].sprite.size;

        top: for(var j=0; j<bullets.length; j++) {
            var pos2 = bullets[j].pos;
            var size2 = bullets[j].sprite.size;

            for (var k = 0; k < megalith.length; k++)
            {
                var pos3 = megalith[k].pos;
                var size3 = megalith[k].sprite.size;

                if (boxCollides(pos2, size2, pos3, size3))
                {
                    createExplosion(pos2);

                    bullets.splice(j, 1);
                    break top;
                }
            }

            if(boxCollides(pos, size, pos2, size2)) {
                enemies.splice(i, 1);
                i--;

                score += 100;

                createExplosion(pos);

                bullets.splice(j, 1);
                break;
            }
        }

        if(boxCollides(pos, size, player.pos, player.sprite.size)) {
            gameOver();
        }
    }
}

function checkPlayerBounds() {
    if(player.pos[0] < 0) {
        player.pos[0] = 0;
    }
    else if(player.pos[0] > canvas.width - player.sprite.size[0]) {
        player.pos[0] = canvas.width - player.sprite.size[0];
    }

    if(player.pos[1] < 0) {
        player.pos[1] = 0;
    }
    else if(player.pos[1] > canvas.height - player.sprite.size[1]) {
        player.pos[1] = canvas.height - player.sprite.size[1];
    }
}

function render() {
    ctx.fillStyle = terrainPattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if(!isGameOver) {
        renderEntity(player);
    }

    renderEntities(bullets);
    renderEntities(enemies);
    renderEntities(explosions);
    renderEntities(megalith);
    renderEntities(manna);
    renderEntities(mannaEat);
};

function renderEntities(list) {
    for(var i=0; i<list.length; i++) {
        renderEntity(list[i]);
    }    
}

function renderEntity(entity) {
    ctx.save();
    ctx.translate(entity.pos[0], entity.pos[1]);
    entity.sprite.render(ctx);
    ctx.restore();
}

function gameOver() {
    document.getElementById('game-over').style.display = 'block';
    document.getElementById('game-over-overlay').style.display = 'block';
    isGameOver = true;
}

function reset() {
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('game-over-overlay').style.display = 'none';
    isGameOver = false;
    gameTime = 0;
    score = 0;
    scoreManna = 0;

    enemies = [];
    bullets = [];
    manna.length = 3;

    player.pos = [50, canvas.height / 2];
};
