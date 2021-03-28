//% weight=10 color=#008B00 icon="\uf2db" block="maqueen"
namespace lib_maqueen {

export let value = {
    D_Ultrasonic : 500,
    Ultrasonic : 0,
    LineSensor : { L: 0, R: 0 }
}

export let request = {
    LineSensor : 0,
    Ultrasonic : 0,
    AutoTrace : 0
}

//% blockId=maqueen_setup_audio block="Setup audio for maqueen"
//% weight=95
export function setupAudio() {
    pins.analogSetPitchPin(AnalogPin.P0)
    pins.setAudioPin(AnalogPin.P0)
    pins.analogWritePin(AnalogPin.P0, 0)
    music.setBuiltInSpeakerEnabled(false)
}

/**
 * Start maqueen service
 */
//% blockId=maqueen_start block="Start maqueen"
//% weight=95
export function start() {
    reset()
    lib_mbitlink.reseter(reset)
    lib_mbitlink.reciver(parse)
    lib_mbitlink.inspecter(inspect)
}

export function reset() {
    maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CW, 0)
    maqueen.writeLED(maqueen.LED.LEDLeft, maqueen.LEDswitch.turnOff)
    maqueen.writeLED(maqueen.LED.LEDRight, maqueen.LEDswitch.turnOff)
    request.LineSensor = 0
    request.Ultrasonic = 0
    request.AutoTrace = 0
}

function R(str : string) : boolean{
    let c = str.charAt(0)
    str = str.substr(1)
    if (c == "S") {
        request.LineSensor = parseInt(str)
        return true
    }
    if (c == "U") {
        request.Ultrasonic = parseInt(str)
        return true
    }
    if (c == "A") {
        request.AutoTrace = parseInt(str)
        if (request.AutoTrace == 0) {
            maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CW, 0)
            maqueen.writeLED(maqueen.LED.LEDLeft, maqueen.LEDswitch.turnOff)
            maqueen.writeLED(maqueen.LED.LEDRight, maqueen.LEDswitch.turnOff)
            bluetooth.uartWriteString("MB0,LB0")
        }
        return true
    }
    return false
}

function M(str : string) {
    let c = str.charAt(0)
    str = str.substr(1)
    let v = parseInt(str)
    if (c == "L") {
        if (v >= 0) {
            maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CW, v)
        } else {
            maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CCW, Math.abs(v))
        }
        bluetooth.uartWriteString("ML" + v)
        return
    }
    if (c == "R") {
        if (v >= 0) {
            maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CW, v)
        } else {
            maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CCW, Math.abs(v))
        }
        bluetooth.uartWriteString("MR" + v)
        return
    }
    if (c == "B") {
        if (v >= 0) {
            maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CW, v)
        } else {
            maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CCW, Math.abs(v))
        }
        bluetooth.uartWriteString("MB" + v)
        return
    }
}

function keepline() {
    let cl = maqueen.readPatrol(maqueen.Patrol.PatrolLeft)
    let cr = maqueen.readPatrol(maqueen.Patrol.PatrolRight)
    let cv = cl + cr
    if (cv != 1) return
    if ((value.LineSensor.L + value.LineSensor.R) != 0) return
    let m = ""
    if (cr == 1) {
        maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CW, 0)
        m += ",ML0"
    } else {
        maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CW, 0)
        m += ",MR0"
    }
    if ((request.AutoTrace & 2) != 0) {
        if (cr == 1) {
            maqueen.writeLED(maqueen.LED.LEDRight, maqueen.LEDswitch.turnOn)
            m += ",LR1"
        } else {
            maqueen.writeLED(maqueen.LED.LEDLeft, maqueen.LEDswitch.turnOn)
            m += ",LL1"
        }
    }
    if (m.length > 0) {
        bluetooth.uartWriteString(m.substr(1))
    }
    if ((request.AutoTrace & 4) != 0) {
        music.playTone(131, music.beat(BeatFraction.Sixteenth))
    }
    while (cv != 0) {
        cl = maqueen.readPatrol(maqueen.Patrol.PatrolLeft)
        cr = maqueen.readPatrol(maqueen.Patrol.PatrolRight)
        cv = cl + cr
    }
    value.LineSensor.L = 0
    value.LineSensor.R = 0
    maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CW, 0)
    m = "MB0,SB0"
    if ((request.AutoTrace & 2) != 0) {
        maqueen.writeLED(maqueen.LED.LEDRight, maqueen.LEDswitch.turnOff)
        maqueen.writeLED(maqueen.LED.LEDLeft, maqueen.LEDswitch.turnOff)
        m += ",LB0"
    }
    bluetooth.uartWriteString(m)
}

function L(str : string) {
    let c = str.charAt(0)
    str = str.substr(1)
    let v = maqueen.LEDswitch.turnOff
    if (str.charAt(0) != "0") v = maqueen.LEDswitch.turnOn
    if (c == "L") {
        maqueen.writeLED(maqueen.LED.LEDLeft, v)
        bluetooth.uartWriteString("LL" + str)
        return
    }
    if (c == "R") {
        maqueen.writeLED(maqueen.LED.LEDRight, v)
        bluetooth.uartWriteString("LR" + str)
        return
    }
    if (c == "B") {
        maqueen.writeLED(maqueen.LED.LEDLeft, v)
        maqueen.writeLED(maqueen.LED.LEDRight, v)
        bluetooth.uartWriteString("LB" + str)
        return
    }
}

function parse(str : string) : boolean {
    let c = str.charAt(0)
    str = str.substr(1)
    if (c == "M") {
        M(str)
        return true
    }
    if (c == "L") {
        L(str)
        return true
    }
    if (c == "G") {
        let g = str.charAt(1)
        let v = AcceleratorRange.EightG
        if (g == "1") v = AcceleratorRange.OneG
        else if (g == "2") v = AcceleratorRange.TwoG
        else if (g == "4") v = AcceleratorRange.FourG
        input.setAccelerometerRange(v)
        return true
    }
    if (c == "R") {
        return R(str)
    }
    return false
}

function inspect() {
    if (request.AutoTrace != 0) {
        keepline()
    }
    if ((request.LineSensor & 1) != 0) {
        let cl = maqueen.readPatrol(maqueen.Patrol.PatrolLeft)
        let cr = maqueen.readPatrol(maqueen.Patrol.PatrolRight)
        if (value.LineSensor.L != cl) {
            value.LineSensor.L = cl
            if (value.LineSensor.L == value.LineSensor.R)
                bluetooth.uartWriteString("SB" + value.LineSensor.L)
            else bluetooth.uartWriteString("SL" + value.LineSensor.L)
        }
        if (value.LineSensor.R != cr) {
            value.LineSensor.R = cr
            if (value.LineSensor.L == value.LineSensor.R)
                bluetooth.uartWriteString("SB" + value.LineSensor.R)
            else bluetooth.uartWriteString("SR" + value.LineSensor.R)
        }
    }
    if (request.Ultrasonic > 0) {
        let v = maqueen.Ultrasonic(PingUnit.Centimeters)
        if (request.Ultrasonic > 1) {
            v = Math.floor(v / request.Ultrasonic) * request.Ultrasonic
        }
        if (value.Ultrasonic != v) {
            value.Ultrasonic = v
            bluetooth.uartWriteString("U-" + value.Ultrasonic)
        }
    }
}

}
