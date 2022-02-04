
class PathFindingScene extends Phaser.Scene {
    /** @type {Phaser.Tilemaps.Tilemap} */
    map
    /** @type {Player} */
    player
    /** @type  {Phaser.Physics.Arcade.Sprite} */
    gun
    /** @type {Array.<Enemy>} */
    enemies = []
    /** @type {Array.<object>} */
    enemySpawnPoints = []
    /** @type {Enemy} */
    activeEnemy
    /** @type {number} */
    minEnemies = 2
    /** @type  {Phaser.Physics.Arcade.Group} */
    bullets

    constructor() {
        super({ key: 'pathFindingScene' })
    }
    preload() {
        //tilemap and tileset
        this.load.image('tileSetMain', 'assets/tiles100-spacing2.png')
        this.load.tilemapTiledJSON('tilemap', 'assets/level1.json')

        //player assets
        this.load.image('player', 'assets/man.png')
        this.load.image('playerGun', 'assets/man-with-gun.png')

        //weapon assets
        this.load.image('pistol', 'assets/gun.png')
        this.load.image('bullet', 'assets/bullet.png')

        //enemy assets
        this.load.image('enemy', 'assets/enemy.png')
        this.load.image('dead enemy', 'assets/dead-enemy.png')

        //collectables
        this.load.image('redJewl', 'assets/red-jewel.png')


    }
    create() {
        //creating world
        this.map = this.make.tilemap({ key: 'tilemap' })
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)

        //calling for layers and map
        const tileset = this.map.addTilesetImage('tileSetMain', 'tileSetMain')
        const groundAndWallsLayer = this.map.createLayer('groundAndWallsLayer', tileset, 0, 0)

        //custom property addded to wall tiles is false walls collidable
        groundAndWallsLayer.setCollisionByProperty({ valid: false })

        const objectLayer = this.map.getObjectLayer('objectLayer')
        //for each method, objects on object layer recive properties and syntax from Utils js(tidying it up)
        objectLayer.objects.forEach(function (object) {
            let dataObject = Utils.RetrieveCustomProperties(object)
            // Spawn player in with physical properties
            if (dataObject.type == 'playerSpawn') {
                this.player = new Player(this, dataObject.x, dataObject.y, 'player')
                //gun spawn - physics not working because inside anon object - solution is to use comment
            } else if (dataObject.type == 'gunSpawn') {
                //@ts-ignore
                this.gun = this.physics.add.sprite(dataObject.x, dataObject.y, 'pistol')
                //enemy spawn
            } else if (dataObject.type == 'enemySpawn') {
                //push data object into enemy spawn point
                //@ts-ignore
                this.enemySpawnPoints.push(dataObject) //x and y postition 

            }
        }, this)
        //player has been created add collision
        this.physics.add.collider(this.player.sprite, groundAndWallsLayer)
        //player collide with gun
        this.physics.add.overlap(this.player.sprite, this.gun, this.collectGun, null, this)

        //bullet group
        this.bullets = this.physics.add.group({
            defaultKey: 'bullet',
            maxSize: 5,
            collideWorldBounds: true
        })
        //gets triggered if bullet hits worlds bounds
        this.physics.world.on('worldbounds', this.worldBoundsBullet, this)

        //collider for when it hits the wall
        this.physics.add.collider(this.bullets, groundAndWallsLayer, this.bulletHitWall, null, this)

        //player emits event fire bullet, code picks it up (listner)
        this.events.on('firebullet', this.fireBullet, this)

        //enemy stuff
        this.events.on('enemyReady', this.handleEnemyMove, this)
        //phaser delayed call for enemy spawn
        this.time.delayedCall(1000, this.onEnemySpawn, [], this) //milliseconds
        this.time.delayedCall(3000, this.onEnemySpawn, [], this) 
        //@ts-ignore
        this.finder = new EasyStar.js()//libary
        //create 2d representation of the map tiles 
        let grid = [] //creating new grid which is empty
        for (let y = 0; y < this.map.height; y++) {
            let col = [] //symbolizes collum
            for (let x = 0; x < this.map.width; x++) {
                //in each cell store tile ID
                let tile = this.map.getTileAt(x, y)
                if (tile) {
                    col.push(tile.index)
                } else {
                    //if no tile push 0
                    col.push(0)
                }
            }
            grid.push(col) // pushing grid into colum
        }
        //tell easystar about the map - all the tiles so far
        this.finder.setGrid(grid)
        //filter tiles

        //get tileset props
        let properties = tileset.tileProperties
        //will hold valid tiles
        let acceptableTiles = []
        //iterate through tile ids in tileset
        for (let i = tileset.firstgid - 1; i < tileset.total; i++) {
            //look for tiles with property valid == true
            if (properties[i] && properties[i].valid) {
                //add valid tile to acceptable tiles list
                acceptableTiles.push(i + 1)
            }
        }
        //which tiles can be used by easystar
        this.finder.setAcceptableTiles(acceptableTiles)
       



    }
    findPath(point) {
        //point object has x and y in pixels
        let toX = Math.floor(point.x / this.map.tileWidth)//math floor?
        let toY = Math.floor(point.y / this.map.tileHeight)
        let fromX = Math.floor(this.activeEnemy.sprite.x/this.map.tileWidth)
        let fromY = Math.floor(this.activeEnemy.sprite.y/this.map.tileHeight)
        console.log('going from ' +fromX+' and '+fromY+' to '+toX+ ' and '+toY)

        //forces enemy to be called within scene
        let callback = this.moveEnemy.bind(this)
        //call method find path- setiup path querey 
        this.finder.findPath(fromX, fromY, toX, toY, function(path){
            if(path === null){
                console.warn("path not found")
            }else{
                console.log("found path")
                //call callback
                callback(path)
            }
        })
        //execute path query
        this.finder.calculate()

    }

    moveEnemy(path) {
        //checking if its happened then stopping all process
        if(this.player.isDead){
            return //stop the enemy movement - end of process 
        }
        let tweenList = [] // twween timeline
        for(let i = 0; i < path.length - 1; i++){
            //current pos
            let cx = path[i].x
            let cy = path[i].y
            //target pos
            let dx = path[i + 1].x
            let dy = path[i +1].y
            //taregt angle rotation in degrees
            let a 
            if (dx > cx){
                a = 0 
            } else if (dx < cx){
                a = 180
            }else if (dy < cy){
                a = 90
            }else if ( dy < cy){
                a = 270
            }
            //phaser  tween
            tweenList.push({
                targets: this.activeEnemy.sprite, // target - finds path - triggers pathfinding - comesbacxk with results - setup tweens for the enemy
                x: {value: (dx * this.map.tileWidth) + (0.5 * this.map.tileWidth), duration: this.activeEnemy.speed}, // gives x postion of pixels then divide gives middle
                y: {value: (dy * this.map.tileHeight) + (0.5 * this.map.tileHeight), duration: this.activeEnemy.speed},
                angle: {value: a, duration: 0}
            })
        }

        this.tweens.timeline({
            tweens:tweenList
        })

    }
    onEnemySpawn() {
        //console.log('enemySpawn')
        //spawn enemy at random location
        let index = Phaser.Math.Between(0, this.enemySpawnPoints.length - 1)//give us a valid index
        let spawnPoint = this.enemySpawnPoints[index]// getting a random index out of the array forr the enemy to spawn at
        let enemy = new Enemy(this, spawnPoint.x, spawnPoint.y, 'enemy')
        //enemy target heads towards player spawn?
        enemy.targetX = spawnPoint.x
        enemy.targetY = spawnPoint.y
        this.enemies.push(enemy)
        this.physics.add.overlap(this.player.sprite, enemy.sprite, this.collideEnemy, null, this)
    }
    handleEnemyMove(enemy) {
        //assign enemies because more than one enemy will be using it
        this.activeEnemy = enemy
        //calculates where the player is in the tile
        let toX = Math.floor(this.player.sprite.x / this.map.tileWidth) * this.map.tileWidth + (this.map.tileWidth/2)
        let toY = Math.floor(this.player.sprite.y / this.map.tileHeight) * this.map.tileHeight + (this.map.tileHeight/2)
        //pass through location of player through find path
        //set enemy target to x and y, part of enemy checking wheter can re-move 
        enemy.targetX = toX
        enemy.targetY = toY
        this.findPath({x:toX, y:toY})
        //this.findPath({x:this.player.sprite.x, y:this.player.sprite.y})
    }
    collectGun(player, gun) {
        //getting rid of gun sprite - destroy belongs to GameObjects
        this.gun.destroy()
        this.player.hasGun = true

        //changing texture to gun held
        this.player.sprite.setTexture('playerGun')
    }
    fireBullet() {
        //vector creates new object to fire bullet from correct placement
        let vector = new Phaser.Math.Vector2(48, 19)
        console.log(vector)
        //rotate vector in radians
        vector.rotate(this.player.sprite.rotation)
        //spawn at player
        let bullet = this.bullets.get(this.player.sprite.x + vector.x, this.player.sprite.y + vector.y)
        if (bullet) {
            //to be able to see bullet above everything preventing it to go over world bounds
            bullet.setDepth(3)
            bullet.body.collideWorldBounds = true
            //trigger event to know if its happening to return it to the pool
            bullet.body.onWorldBounds = true
            bullet.enableBody(false, bullet.x, bullet.y, true, true)
            //bullet rotation to match player
            bullet.rotation = this.player.sprite.rotation
            this.physics.velocityFromRotation(bullet.rotation, 500, bullet.body.velocity) //200 speed
            for(let i = 0; i < this.enemies.length; i++){
                this.physics.add.collider(this.enemies[i].sprite,bullet,this.bulletHitEnemy,null,this)
            }
        }
    }
    worldBoundsBullet(body) {
        //return bullet to 'pool'
        //refernece to the event- access game object
        body.gameObject.disableBody(true, true)
    }
    bulletHitWall(bullet, layer) {
        //stops bullet once collides with wall
        bullet.disableBody(true, true)
    }
    bulletHitEnemy(enemySprite, bullet) {
        bullet.disableBody(true,true)
        let index
        for(let i = 0; i < this.enemies.length;i++){
            if(this.enemies[i].sprite === enemySprite){
                index = i
                break
            }
        }
        this.enemies.splice(index, 1)
        this.add.image(enemySprite.x, enemySprite.y, 'dead enemy').setRotation(enemySprite.rotation).setDepth(0)//add dead enemy image
        enemySprite.destroy()
        if(!this.player.isDead && this.enemies.length < this.minEnemies){
            this.onEnemySpawn()
        }

    }
    collideEnemy(player, enemySprite) {
        this.tweens.killAll()
        this.physics.pause()
        this.player.isDead = true
        this.player.sprite.setTint(0xFF0000)

    }
    update(time, delta) {
        //updates the players movement
        this.player.update(time, delta)
        //update enemies
        for(let i = 0; i < this.enemies.length; i++){
            this.enemies[i].update(time, delta)
        }
    }
}
// dugeon crawler