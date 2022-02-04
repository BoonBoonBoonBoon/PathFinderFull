class Enemy {
    /** @type {Phaser.Physics.Arcade.Sprite} */
    sprite
    /** @type {number} */
    speed = 200 // milliseconds between tile to tile movement
    /** @type {number} */
    targetX
    /** @type {number} */
    targetY
    /** @type {boolean} */
    pendingMove
    constructor(scene, x, y, texture) {
        //add sprite into scene
        this.scene = scene
        this.sprite = scene.physics.add.sprite(x, y, texture)
        //whatever happens with physics it cant move enemy body
        this.sprite.body.immovable = true
        
    }
    update(time, delta) {
        //checking if its moving or not
        if(!this.pendingMove && this.sprite.x == this.targetX && this.sprite.y == this.targetY){
            this.pendingMove = true
            //delayed call
            this.scene.time.delayedCall(500, this.beginMove, [], this)
            //every frame it checks if it can move once the timer elapses 
        }
        //rotate collsion box depeending on current rotation
        if(this.sprite.angle == 0 || Math.abs(this.sprite.angle) == 0){ // moving right or left - math.abs converts minus to posative
            this.sprite.setSize(this.sprite.width, this.sprite.height)
        }else if (Math.abs(this.sprite.angle) == 90 || Math.abs(this.sprite.angle) == 270){
            this.sprite.setSize(this.sprite.height, this.sprite.width)
        }
    }
    beginMove() {
        // move grid by grid pathfinding in middle of tile, use physics to know if it overlapped player

        this.scene.events.emit('enemyReady',this)//emit sends the event
        this.pendingMove = false
    }

}