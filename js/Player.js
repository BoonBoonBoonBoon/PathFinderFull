class Player {
    /** @type {PathFindingScene} */
    scene
    /** @type {Phaser.Physics.Arcade.Sprite} */
    sprite
    /** @type {number} */
    standardSpeed = 300
    /** @type {number} */
    powerUpSpeed = 600
    /** @type {number} */
    currentSpeed
    /** @type {object} */
    keys
    /** @type {Phaser.Input.Keyboard.Key} */
    spaceBar
    /** @type {boolean} */
    isDead = false
    /** @type {boolean} */
    hasGun = false
    /** @type {number} */
    ammo = 0
    /** @type {number} */
    health = 100
    /** @type {number} */
    maxHealth = this.health
    /** @type {boolean} */
    damage
    /** @type {number} */
    energyAmount = 100
    /** @type {number} */
    maxEnergy = this.energyAmount

    constructor(scene, x, y, texture) {
        this.scene = scene
        this.sprite = scene.physics.add.sprite(x, y, texture)
        //depth
        this.sprite.setDepth(2)
        //wont fall of world
        this.sprite.setCollideWorldBounds(true)
        //accsess to spacebar
        this.spaceBar = scene.input.keyboard.createCursorKeys().space
        //key input from arrows to WASD
        this.keys = scene.input.keyboard.addKeys({
            w: Phaser.Input.Keyboard.KeyCodes.W,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            shift: Phaser.Input.Keyboard.KeyCodes.SHIFT
        })
        //speed controls setting the speed of the player
        this.currentSpeed = this.standardSpeed

    }
    update(time, delta) {
        //make sure player is alive
        if (!this.isDead) {
            if(this.energyAmount > 100){
                this.energyAmount = 100
            }

            if (this.keys.a.isDown) {
                //dissalow diagonal movement only horizontal and vertical - why does changing 0 change movement?
                this.sprite.setVelocity(-this.currentSpeed, 0)
                this.sprite.angle = 180

            } else if (this.keys.d.isDown) {
                //when player moves right is moving 0 degrees when moving left it is moving 180
                this.sprite.setVelocity(this.currentSpeed, 0)
                this.sprite.angle = 0

            } else if (this.keys.s.isDown) {
                //movement is positive goes down
                this.sprite.setVelocity(0, this.currentSpeed)
                this.sprite.angle = 90

            } else if (this.keys.w.isDown) {
                //movement is negative and goes up
                this.sprite.setVelocity(0, -this.currentSpeed)
                this.sprite.angle = 270

            } else {
                this.sprite.setVelocity(0, 0)
            }

            //Player Sprinting and energy exughstion
            if(this.keys.shift.isDown && this.energyAmount >= 1){
                this.energyAmount -= 0.7
                this.currentSpeed = this.powerUpSpeed
                //@ts-ignore
                this.scene.setMeterPercentage(this.energyAmount / this.maxEnergy, this.scene.staminaBar)
            }else if(this.keys.shift.isDown && this.energyAmount == 0){
                this.currentSpeed = this.standardSpeed
            }
            //when player has no energy
            if(!this.keys.shift.isDown && this.energyAmount < 100){
                this.energyAmount += 0.5
                this.currentSpeed = this.standardSpeed
                this.scene.setMeterPercentage(this.energyAmount / this.maxEnergy, this.scene.staminaBar)
            }


            // rotating characters hitbox since player rotation does not rotate it
            //go into body
            if (this.sprite.body.velocity.x != 0) {
                this.sprite.setSize(this.sprite.width, this.sprite.height)

            } else if (this.sprite.body.velocity.y != 0) {
                this.sprite.setSize(this.sprite.height, this.sprite.width)
            }
            //listen to spacebar - shooting
            //if has a gun and spacebar is pressed
            if (this.hasGun && Phaser.Input.Keyboard.JustDown(this.spaceBar) && this.ammo >= 1) {
                this.ammo -- 
                this.scene.events.emit('firebullet')
            }
        }
    }
}