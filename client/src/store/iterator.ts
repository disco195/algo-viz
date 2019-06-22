import { observable, action } from "mobx";
import { RootStore } from ".";

type handler = {
    value: number
    allow: boolean

}

class IteratorStore {
    @observable index: number = -1
    @observable step: any
    @observable name: void | Viz.name
    @observable iterating: boolean = false
    @observable direction: boolean = true
    @observable speed: number = 1
    @observable handling: boolean = false
    @observable handler: handler = { value: 0, allow: true }
    timer: any = null
    maxSpeed: number = 64
    minSpeed: number = 1 / 4
    root: RootStore
    constructor(store: RootStore) {
        this.root = store
    }
    @action next() {
        if (!this.iterating) return false;
        let nextIdx = this.direction ? ++this.index : --this.index
        if (nextIdx < 0) {
            nextIdx = 0
            this.iterating = false
        } else if (nextIdx >= this.root.viz.steps.length) {
            nextIdx = this.root.viz.steps.length - 1
            this.iterating = false
        }
        this.step = this.root.viz.steps[nextIdx]
        this.name = this.step.name
        this.root.code.update()
        this.root.state[this.direction ? 'next' : 'prev'](this.step)
        return true
    }
    @action private begin() {
        if (this.root.editing) {
            this.iterating = false;
            if (this.timer) {
                clearTimeout(this.timer)
                clearImmediate(this.timer)
            }
            return
        }
        if (this.step) {
            const { type } = this.step
            let nextTime = 100
            if (['EXPRESSION', 'CALL', 'DECLARATION', 'ASSIGNMENT', 'RETURN'].includes(type)) {
                nextTime *= 7.5
            }
            const exec = () => {
                const cont = this.next()
                if (cont) {
                    this.begin()
                }
            }
            this.timer = setTimeout(exec, nextTime / this.speed)
        } else {
            this.next()
            this.begin()
        }
    }
    @action play() {
        this.iterating = true
        if (this.index < 0) {
            this.index = -1
            this.direction = true
        } else if (this.index > this.root.viz.steps.length - 1) {
            this.index = this.root.viz.steps.length - 1
            this.direction = false
        }
        this.begin()
    }
    @action pause() {
        this.iterating = false
    }
    @action faster() {
        this.speed *= 2
        if (this.speed > this.maxSpeed) {
            this.speed = this.maxSpeed
        }
    }
    @action slower() {
        this.speed /= 2
        if (this.speed < this.minSpeed) {
            this.speed = this.minSpeed
        }
    }
    // @action overload(bool: boolean) {
    //     if (bool) {
    //         this.overloaded = true
    //         this.root.allowRender = false
    //     } else {
    //         this.overloaded = false
    //         this.root.allowRender = true
    //     }
    // }
    @action beforeChange() {
        if (this.handler.allow) {
            this.handling = true
            this.pause()
            this.handler.value = this.index
        }

    }
    @action change(val: number) {
        this.handler.value = val
    }
    @action afterChange() {
        this.handling = false
        this.handler.allow = false
        const dir = this.direction
        if (this.handler.value > this.index) {
            this.direction = true
        } else {
            this.direction = false
        }
        this.iterating = true
        this.root.allowRender = false
        while (this.index !== this.handler.value) {
            this.next()
        }
        this.root.allowRender = true
        this.iterating = false
        this.direction = dir
        this.play()
        this.handler.allow = true
    }
}
export default IteratorStore