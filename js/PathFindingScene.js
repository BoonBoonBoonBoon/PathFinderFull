
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
    /** @type {Phaser.Cameras.Scene2D.Camera} */
    camera
    /** @type {Phaser.Physics.Arcade.StaticGroup} */
    ammoPickup
    /** @type {Object} */
    staminaBar = {}
    /** @type {Object} */
    healthBar = {}
    /** @type {Phaser.GameObjects.Text} */
    healthText
    /** @type {Phaser.GameObjects.Text} */
    scoreCount
    /** @type {Phaser.GameObjects.Text} */
    multiText
    /** @type {Phaser.GameObjects.Text} */
    wavecount
    /** @type {Phaser.GameObjects.Text} */
    ammoCount
    /** @type {number} */
    score = 0
    /** @type {number} */
    wave = 1
    /** @type {number} */
    scoreMultiplier = 1
    /** @type {number} */
    scoreCombonation = 0
    /** @type {number} */
    maxEnemies = 1

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
        this.load.image('ammo', 'assets/bullets.png')

        //Health Ui Green
        this.load.image('left-cap', 'assets/barHorizontal_green_left.png')
        this.load.image('middle-cap', 'assets/barHorizontal_green_mid.png')
        this.load.image('right-cap', 'assets/barHorizontal_green_right.png')
        //Health UI Whiite
        this.load.image('left-cap-w', 'assets/barHorizontal_white_left.png')
        this.load.image('middle-cap-w', 'assets/barHorizontal_white_left.png')
        this.load.image('right-cap-w', 'assets/barHorizontal_white_left.png')
        //Ui Shadow
        this.load.image('left-cap-shadow', 'assets/barHorizontal_shadow_left.png')
        this.load.image('middle-cap-shadow', 'assets/barHorizontal_shadow_mid.png')
        this.load.image('right-cap-shadow', 'assets/barHorizontal_shadow_right.png')
        this.load.image('left-cap-shadow2', 'assets/barHorizontal_shadow_left.png')
        this.load.image('middle-cap-shadow2', 'assets/barHorizontal_shadow_mid.png')
        this.load.image('right-cap-shadow2', 'assets/barHorizontal_shadow_right.png')


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

        //ammo Spawn
        let ammoSpawn = Utils.FindPoints(this.map, 'objectLayer', 'ammoSpawn')
        this.ammoPickup = this.physics.add.staticGroup()
        for (let point, i = 0; i < ammoSpawn.length; i++) {
            point = ammoSpawn[i]
            this.ammoPickup.create(point.x, point.y, 'ammo')
        }

        //player has been created add collision
        this.physics.add.collider(this.player.sprite, groundAndWallsLayer)
        //player collide with gun
        this.physics.add.overlap(this.player.sprite, this.gun, this.collectGun, null, this)
        //player collide with ammo
        this.physics.add.overlap(this.player.sprite, this.ammoPickup, this.collectAmmo, null, this)

        //Text UI
        this.healthText = this.add.text(730, 50, "100", { fontFamily: 'kenvector_future_thin' }).setFontSize(40).setScrollFactor(0).setDepth(2)
        this.scoreCount = this.add.text(250, 10, 'Score : 0', { fontFamily: 'kenvector_future_thin' }).setFontSize(40).setScrollFactor(0).setDepth(2)
        this.wavecount = this.add.text(420, 10, 'Wave : 1', { fontFamily: 'kenvector_future_thin' }).setFontSize(40).setScrollFactor(0).setDepth(2)
        this.ammoCount = this.add.text(1350, 10, 'Ammo : 0', { fontFamily: 'kenvector_future_thin' }).setFontSize(40).setScrollFactor(0).setDepth(2)
        this.multiText = this.add.text(925, 10, ' x1', { fontFamily: 'kenvector_future_thin' }).setFontSize(40).setScrollFactor(0).setDepth(2)


        //Camera
        this.camera = this.cameras.getCamera('')
        this.camera.setBounds(0, 0, this.map.widthInPixels, this.map.widthInPixels)
        //this.camera.startFollow(this.player)
        this.cameras.main.centerOn(0, 0)

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


        //Shadow Bar

        //creating shadow bar
       
        const y = 30
        const x = 600
 /*
        const leftShadowCap = this.add.image(x, y, 'left-cap-shadow').setOrigin(0, 0.5)

        const middleShaddowCap = this.add.image(leftShadowCap.x + leftShadowCap.width, y, 'middle-cap-shadow').setOrigin(0, 0.5)
        middleShaddowCap.displayWidth = this.fullWidth

        this.add.image(middleShaddowCap.x + middleShaddowCap.displayWidth, y, 'right-cap-shadow').setOrigin(0, 0.5)
*/
        //Second Shadow
        const y2 = 30
        const x2 = 1000
/*
        const leftShadowCap2 = this.add.image(x2, y2, 'left-cap-shadow2').setOrigin(0, 0.5)

        const middleShaddowCap2 = this.add.image(leftShadowCap2.x + leftShadowCap2.width, y, 'middle-cap-shadow2').setOrigin(0, 0.5)
        middleShaddowCap2.displayWidth = this.fullWidth

        this.add.image(middleShaddowCap2.x + middleShaddowCap2.displayWidth, y, 'right-cap-shadow2').setOrigin(0, 0.5)
        */

        //HealthBar First UI
       this.healthBar.leftCap = this.add.image(x, y, 'left-cap').setOrigin(0, 0.5)
        console.log()
       this.healthBar.middle = this.add.image(this.healthBar.leftCap.x + this.healthBar.leftCap.width, y, 'middle-cap').setOrigin(0, 0.5)

       this.healthBar.rightCap = this.add.image(this.healthBar.middle.x + this.healthBar.middle.displayWidth, y, 'right-cap').setOrigin(0, 0.5)

       this.healthBar.fullWidth = 300

       this.setMeterPercentage(0.9, this.healthBar)

        //SecondBar Second UI
        this.staminaBar.leftCap = this.add.image(x2, y2, 'left-cap-w').setOrigin(0, 0.5)

        this.staminaBar.middle = this.add.image(this.staminaBar.leftCap.x + this.staminaBar.leftCap.width, y2, 'middle-cap-w').setOrigin(0, 0.5)

        this.staminaBar.rightCap = this.add.image(this.staminaBar.middle.x + this.staminaBar.middle.displayWidth, y2, 'right-cap-w').setOrigin(0, 0.5)

        this.staminaBar.fullWidth = 300

        this.setMeterPercentage(1, this.staminaBar)
console.log(this.player)
    }

    //HealthBar First UI
/*
    updateHealthBar(leftCap, middle, rightCap) {
        leftCap = this.add.image(x, y, 'left-cap').setOrigin(0, 0.5)

        middle = this.add.image(this.leftCap.x + this.leftCap.width, y, 'middle-cap').setOrigin(0, 0.5)

        rightCap = this.add.image(this.middle.x + this.middle.displayWidth, y, 'right-cap').setOrigin(0, 0.5)

        setMeterPercentage(1)
    }
*/
    setMeterPercentage(percent = 1, Bar) {
        const width = Bar.fullWidth * percent

        Bar.middle.displayWidth = width
        Bar.rightCap.x = Bar.middle.x + Bar.middle.displayWidth
    }

    /*
    setMeterPercentageAnimated(percent = 1, duration = 1000) {
        const width = this.fullWidth * percent
        this.tweens.add({
            targets: this.middle,
            displayWidth: width,
            duration,
            ease: Phaser.Math.Easing.Sine.Out,
            onUpdate: () => {
                this.rightCap.x = this.middle.x + this.middle.displayWidth

                this.leftCap.visible = this.middle.displayWidth > 0
                this.middle.visible = this.middle.displayWidth > 0
                this.rightCap.visible = this.middle.displayWidth > 0
            }
        })
    }
*/


    findPath(point) {
        //point object has x and y in pixels
        let toX = Math.floor(point.x / this.map.tileWidth)//math floor?
        let toY = Math.floor(point.y / this.map.tileHeight)
        let fromX = Math.floor(this.activeEnemy.sprite.x / this.map.tileWidth)
        let fromY = Math.floor(this.activeEnemy.sprite.y / this.map.tileHeight)
        console.log('going from ' + fromX + ' and ' + fromY + ' to ' + toX + ' and ' + toY)

        //forces enemy to be called within scene
        let callback = this.moveEnemy.bind(this)
        //call method find path- setiup path querey 
        this.finder.findPath(fromX, fromY, toX, toY, function (path) {
            if (path === null) {
                console.warn("path not found")
            } else {
                ("found path")
                //call callback
                callback(path)
            }
        })
        //execute path query
        this.finder.calculate()

    }

    moveEnemy(path) {
        //checking if its happened then stopping all process
        if (this.player.isDead) {
            return //stop the enemy movement - end of process 
        }
        let tweenList = [] // twween timeline
        for (let i = 0; i < path.length - 1; i++) {
            //current pos
            let cx = path[i].x
            let cy = path[i].y
            //target pos
            let dx = path[i + 1].x
            let dy = path[i + 1].y
            //taregt angle rotation in degrees
            let a
            if (dx > cx) {
                a = 0
            } else if (dx < cx) {
                a = 180
            } else if (dy < cy) {
                a = 90
            } else if (dy < cy) {
                a = 270
            }
            //phaser  tween
            tweenList.push({
                targets: this.activeEnemy.sprite, // target - finds path - triggers pathfinding - comesbacxk with results - setup tweens for the enemy
                x: { value: (dx * this.map.tileWidth) + (0.5 * this.map.tileWidth), duration: this.activeEnemy.speed }, // gives x postion of pixels then divide gives middle
                y: { value: (dy * this.map.tileHeight) + (0.5 * this.map.tileHeight), duration: this.activeEnemy.speed },
                angle: { value: a, duration: 0 }
            })
        }

        this.tweens.timeline({
            tweens: tweenList
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
        let toX = Math.floor(this.player.sprite.x / this.map.tileWidth) * this.map.tileWidth + (this.map.tileWidth / 2)
        let toY = Math.floor(this.player.sprite.y / this.map.tileHeight) * this.map.tileHeight + (this.map.tileHeight / 2)
        //pass through location of player through find path
        //set enemy target to x and y, part of enemy checking wheter can re-move 
        enemy.targetX = toX
        enemy.targetY = toY
        this.findPath({ x: toX, y: toY })
        //this.findPath({x:this.player.sprite.x, y:this.player.sprite.y})
    }
    collectGun(player, gun) {
        //getting rid of gun sprite - destroy belongs to GameObjects
        this.gun.destroy()
        this.player.hasGun = true

        //changing texture to gun held
        this.player.sprite.setTexture('playerGun')
        //ammo spent
        this.ammoCount.setText('Ammo : ' + this.player.ammo)
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
            for (let i = 0; i < this.enemies.length; i++) {
                this.physics.add.collider(this.enemies[i].sprite, bullet, this.bulletHitEnemy, null, this)
            }
        }
        //bullet decrement
        this.ammoCount.setText('Ammo : ' + this.player.ammo)
    }
    collectAmmo(player, ammo) {
        this.player.ammo += 20
        this.ammoCount.setText('Ammo : ' + this.player.ammo)
        ammo.destroy()
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
        bullet.disableBody(true, true)
        let index
        for (let i = 0; i < this.enemies.length; i++) {
            if (this.enemies[i].sprite === enemySprite) {
                index = i
                break
            }
        }
        this.enemies.splice(index, 1)
        this.add.image(enemySprite.x, enemySprite.y, 'dead enemy').setRotation(enemySprite.rotation).setDepth(0)//add dead enemy image
        enemySprite.destroy()
        //Combonation Increment
        this.scoreCombonation += 1
        //Score Points
        if (this.scoreMultiplier == 1) {
            this.score += 1
        } else if (this.scoreMultiplier == 2) {
            this.score += 2
        } else if (this.scoreMultiplier == 3) {
            this.score += 3
        } else if (this.scoreMultiplier == 4) {
            this.score += 4
        }
        this.calculateCurrentWave()
        // Score UI
        this.scoreCount.setText('Score : ' + this.score)
        //wave UI
        this.wavecount.setText('Wave : ' + this.wave)
        if (!this.player.isDead && this.enemies.length < this.maxEnemies) {
            this.onEnemySpawn()
        }

    }

    calculateCurrentWave() {
        // Wave increment
        if (this.score >= 5) {
            this.wave = 2
            this.wavecount.setText('Wave : ' + this.wave)
            if (this.maxEnemies < 2) {
                this.onEnemySpawn()
                this.maxEnemies++
            }
        }
        if (this.score >= 10) {
            this.wave = 3
            this.wavecount.setText('Wave : ' + this.wave)
            if (this.maxEnemies < 3) {
                this.onEnemySpawn()
                this.maxEnemies++
            }
        }
        if (this.score >= 15) {
            this.wave = 4
            this.wavecount.setText('Wave : ' + this.wave)
            if (this.maxEnemies < 4) {
                this.onEnemySpawn()
                this.maxEnemies++
            }
        }
        if (this.score >= 20) {
            this.wave = 5
            this.wavecount.setText('Wave : ' + this.wave)
            if (this.maxEnemies < 5) {
                this.onEnemySpawn()
                this.maxEnemies++
            }
        }
    }
    collideEnemy(player, enemySprite) {
        if (this.player.health == 0) {
            this.tweens.killAll()
            this.physics.pause()
            this.player.isDead = true
            this.player.sprite.setTint(0xFF0000)
            //player takes damage
        } else if (!this.player.damage) {
            this.player.health -= 10
            //reset multiplyer
            this.scoreMultiplier = 1
            this.scoreCombonation = 0
            //damage cooldown
            this.player.damage = true
            setTimeout(() => { this.player.damage = false }, 2000)
            this.setMeterPercentage(this.player.health / this.player.maxHealth, this.healthBar)
        }

    }
    update(time, delta) {
        //this.ammoCount.setText('Ammo : ' + this.player.ammo)
        (this.ammoCount)
        //updates the players movement
        this.player.update(time, delta)
        //update enemies
        for (let i = 0; i < this.enemies.length; i++) {
            this.enemies[i].update(time, delta)
        }

        // score multi
        if (this.scoreCombonation >= 15) {
            this.scoreMultiplier = 4
        } else if (this.scoreCombonation >= 10) {
            this.scoreMultiplier = 3
        } else if (this.scoreCombonation >= 5) {
            this.scoreMultiplier = 2
        }

    }
}
// dugeon crawler