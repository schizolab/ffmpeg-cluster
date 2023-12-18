export class CoolDown {
    constructor(cooldownTime) {
        this.cooldownTime = cooldownTime
        this.lastTime = 0
    }

    _getIsCool() {
        const currentTime = Date.now()
        if (currentTime - this.lastTime < this.cooldownTime) {
            return false
        }
        this.lastTime = currentTime
        return true
    }

    execute(callback) {
        if (this._getIsCool()) {
            callback()
        }
    }

    executeAsync(callbackAsync) {
        if (this._getIsCool()) {
            return callbackAsync()
        }
    }
}