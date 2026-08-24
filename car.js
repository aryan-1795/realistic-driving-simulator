// car.js — physics model for the car (kept independent of rendering)

export const GEAR_RATIOS = { R: -3.6, N: 0, 1: 3.45, 2: 2.10, 3: 1.42, 4: 1.03, 5: 0.83, 6: 0.65 };
export const GEAR_ORDER = ['R', 'N', 1, 2, 3, 4, 5, 6];

const FINAL_DRIVE = 3.7;
const WHEEL_RADIUS = 0.33;      // m
const WHEELBASE = 2.65;         // m
const MASS = 1250;              // kg
const IDLE_RPM = 900;
const REDLINE_RPM = 6800;
const MAX_RPM = 7200;
const PEAK_TORQUE_RPM = 4300;
const PEAK_TORQUE = 340;        // Nm
const DRAG_COEFF = 0.38;        // aerodynamic drag
const ROLL_COEFF = 4.2;         // rolling resistance
const BRAKE_FORCE = 9200;       // N
const HANDBRAKE_FORCE = 14000;  // N, plus kills rear grip
const MAX_STEER = 0.58;         // rad (~33deg)
const STEER_SPEED = 2.6;        // rad/s the wheel can turn
const SHIFT_LOCK_SPEED = 2.5;   // m/s — below this you may cross R<->forward

function engineTorque(rpm) {
  // Simple bell-ish torque curve peaking around PEAK_TORQUE_RPM
  if (rpm <= IDLE_RPM) return PEAK_TORQUE * 0.35;
  if (rpm < PEAK_TORQUE_RPM) {
    const t = (rpm - IDLE_RPM) / (PEAK_TORQUE_RPM - IDLE_RPM);
    return PEAK_TORQUE * (0.35 + 0.65 * t);
  }
  const t = Math.min(1, (rpm - PEAK_TORQUE_RPM) / (MAX_RPM - PEAK_TORQUE_RPM));
  return PEAK_TORQUE * (1 - 0.55 * t);
}

export class Car {
  constructor() {
    this.position = { x: 0, z: 0 };
    this.heading = 0;          // radians, 0 = facing -Z
    this.speed = 0;            // signed, m/s (+ forward)
    this.steerAngle = 0;       // current visual steer angle
    this.gear = 'N';
    this.rpm = IDLE_RPM;
    this.wheelSpin = 0;        // for visual wheel rotation
    this.shiftWarning = 0;     // seconds remaining to flash a "can't shift" warning
    this.grounded = true;
  }

  requestGear(g) {
    const crossingDirection =
      (g === 'R' && this.speed > SHIFT_LOCK_SPEED) ||
      (typeof g === 'number' && this.speed < -SHIFT_LOCK_SPEED);
    if (crossingDirection) {
      this.shiftWarning = 0.6;
      return false;
    }
    this.gear = g;
    return true;
  }

  update(dt, input) {
    const { throttle, brake, handbrake, steer } = input;
    const ratio = GEAR_RATIOS[this.gear] ?? 0;

    // --- Engine RPM ---
    if (ratio !== 0) {
      const wheelAngular = this.speed / WHEEL_RADIUS;
      const engineAngular = Math.abs(wheelAngular * ratio * FINAL_DRIVE);
      const targetRpm = Math.max(IDLE_RPM, Math.min(MAX_RPM, engineAngular * (60 / (2 * Math.PI))));
      this.rpm += (targetRpm - this.rpm) * Math.min(1, dt * 12);
    } else {
      // Neutral: engine free-revs with throttle
      const targetRpm = IDLE_RPM + throttle * (MAX_RPM - IDLE_RPM) * 0.85;
      this.rpm += (targetRpm - this.rpm) * Math.min(1, dt * 4);
    }
    this.rpm = Math.max(IDLE_RPM * 0.9, Math.min(MAX_RPM, this.rpm));

    // --- Drive force ---
    let driveForce = 0;
    if (ratio !== 0 && this.rpm < REDLINE_RPM + 200) {
      const torque = engineTorque(this.rpm);
      const wheelForce = (torque * Math.abs(ratio) * FINAL_DRIVE) / WHEEL_RADIUS;
      driveForce = Math.sign(ratio) * throttle * wheelForce;
    }

    // --- Brake / handbrake ---
    let brakeForce = 0;
    if (brake > 0 && Math.abs(this.speed) > 0.02) {
      brakeForce = -Math.sign(this.speed) * brake * BRAKE_FORCE;
    }
    if (handbrake && Math.abs(this.speed) > 0.02) {
      brakeForce += -Math.sign(this.speed) * HANDBRAKE_FORCE;
    }

    // --- Resistances ---
    const drag = -DRAG_COEFF * this.speed * Math.abs(this.speed);
    const roll = -ROLL_COEFF * this.speed;

    const netForce = driveForce + brakeForce + drag + roll;
    let accel = netForce / MASS;

    // Prevent brake from reversing direction of travel (no jitter through zero)
    const prevSpeed = this.speed;
    this.speed += accel * dt;
    if (Math.sign(this.speed) !== Math.sign(prevSpeed) && brake + (handbrake ? 1 : 0) > 0 && driveForce === 0) {
      this.speed = 0;
    }
    if (Math.abs(this.speed) < 0.015 && driveForce === 0) this.speed = 0;

    // --- Steering ---
    const targetSteer = MAX_STEER * steer / (1 + Math.abs(this.speed) * 0.045);
    const maxDelta = STEER_SPEED * dt;
    const diff = targetSteer - this.steerAngle;
    this.steerAngle += Math.max(-maxDelta, Math.min(maxDelta, diff));

    const yawRate = (this.speed / WHEELBASE) * Math.tan(this.steerAngle);
    this.heading += yawRate * dt;

    this.position.x += Math.sin(this.heading) * this.speed * dt;
    this.position.z += Math.cos(this.heading) * this.speed * dt;

    this.wheelSpin += (this.speed / WHEEL_RADIUS) * dt;

    if (this.shiftWarning > 0) this.shiftWarning = Math.max(0, this.shiftWarning - dt);
  }

  get speedKmh() {
    return this.speed * 3.6;
  }

  get rpmFraction() {
    return this.rpm / MAX_RPM;
  }

  get isRedline() {
    return this.rpm >= REDLINE_RPM;
  }
}

export const CAR_CONSTANTS = { WHEEL_RADIUS, WHEELBASE, REDLINE_RPM, MAX_RPM, IDLE_RPM };
