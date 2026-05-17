import { bus, type PomodoroPhase, type PomodoroSnapshot, type PomodoroStatus } from './events.js'

interface PomodoroConfig {
  workSeconds: number
  shortBreakSeconds: number
  longBreakSeconds: number
  /** Long break after this many work sessions. */
  longBreakEvery: number
}

const DEFAULT_CONFIG: PomodoroConfig = {
  workSeconds: 25 * 60,
  shortBreakSeconds: 5 * 60,
  longBreakSeconds: 15 * 60,
  longBreakEvery: 4
}

class Pomodoro {
  private config: PomodoroConfig = DEFAULT_CONFIG
  private phase: PomodoroPhase = 'work'
  private status: PomodoroStatus = 'idle'
  private remaining: number = this.config.workSeconds
  private completedWorkSessions = 0
  private tickHandle: NodeJS.Timeout | null = null

  snapshot(): PomodoroSnapshot {
    return {
      phase: this.phase,
      status: this.status,
      remaining: this.remaining,
      duration: this.phaseDuration(this.phase),
      completedWorkSessions: this.completedWorkSessions
    }
  }

  start(): void {
    if (this.status === 'running') return
    if (this.status === 'idle') this.remaining = this.phaseDuration(this.phase)
    this.status = 'running'
    bus.emit({ type: 'pomodoro.status_changed', status: this.status, snapshot: this.snapshot() })
    this.scheduleTick()
  }

  pause(): void {
    if (this.status !== 'running') return
    this.status = 'paused'
    this.clearTick()
    bus.emit({ type: 'pomodoro.status_changed', status: this.status, snapshot: this.snapshot() })
  }

  resume(): void {
    if (this.status !== 'paused') return
    this.start()
  }

  skip(): void {
    this.advancePhase()
  }

  reset(): void {
    this.clearTick()
    this.phase = 'work'
    this.status = 'idle'
    this.completedWorkSessions = 0
    this.remaining = this.phaseDuration(this.phase)
    bus.emit({ type: 'pomodoro.phase_changed', phase: this.phase, snapshot: this.snapshot() })
    bus.emit({ type: 'pomodoro.status_changed', status: this.status, snapshot: this.snapshot() })
  }

  private phaseDuration(phase: PomodoroPhase): number {
    switch (phase) {
      case 'work': return this.config.workSeconds
      case 'short_break': return this.config.shortBreakSeconds
      case 'long_break': return this.config.longBreakSeconds
    }
  }

  private nextPhase(): PomodoroPhase {
    if (this.phase === 'work') {
      const nextWorkCount = this.completedWorkSessions + 1
      return nextWorkCount % this.config.longBreakEvery === 0 ? 'long_break' : 'short_break'
    }
    return 'work'
  }

  private advancePhase(): void {
    const completed = this.phase
    if (completed === 'work') this.completedWorkSessions += 1
    bus.emit({ type: 'pomodoro.session_completed', phase: completed, snapshot: this.snapshot() })

    this.phase = this.nextPhase()
    this.remaining = this.phaseDuration(this.phase)
    bus.emit({ type: 'pomodoro.phase_changed', phase: this.phase, snapshot: this.snapshot() })

    // Auto-continue: keep the cycle rolling. Users can pause if they want.
    if (this.status === 'running') this.scheduleTick()
  }

  private scheduleTick(): void {
    this.clearTick()
    this.tickHandle = setInterval(() => this.onTick(), 1000)
  }

  private clearTick(): void {
    if (this.tickHandle) {
      clearInterval(this.tickHandle)
      this.tickHandle = null
    }
  }

  private onTick(): void {
    this.remaining = Math.max(0, this.remaining - 1)
    bus.emit({ type: 'pomodoro.tick', snapshot: this.snapshot() })
    if (this.remaining === 0) this.advancePhase()
  }
}

export const pomodoro = new Pomodoro()
