let audioContext:AudioContext|null=null

export function successFeedback(){
  navigator.vibrate?.(35)
  try{
    audioContext??=new AudioContext()
    const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime
    oscillator.type='sine';oscillator.frequency.setValueAtTime(740,now);oscillator.frequency.exponentialRampToValueAtTime(980,now+.1)
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.08,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+.16)
    oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(now);oscillator.stop(now+.17)
  }catch{/* Haptic feedback is enough when audio is unavailable. */}
}

export function alertFeedback(){navigator.vibrate?.([70,45,70])}
