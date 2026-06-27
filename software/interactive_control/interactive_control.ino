/*
 * Interactive Turret Control
 * Serial command interface for the React web UI.
 * Baud: 9600
 *
 * Commands (newline-terminated):
 *   HOME_Y               - home Y axis via limit switch
 *   JOG_X:±<steps>      - relative jog X
 *   JOG_Y:±<steps>      - relative jog Y
 *   JOG_T:±<steps>      - relative jog trigger
 *   AIM:<xMm>,<yMm>     - move to canvas coordinates
 *   FIRE                 - fire using stored trigger positions
 *   AIM_FIRE:<x>,<y>    - aim then fire
 *   AIM_STEPS:<sx>,<sy>    - move to pre-computed step positions
 *   AIM_FIRE_STEPS:<sx>,<sy> - move to steps then fire
 *   SET_XMIN             - save current X as left limit
 *   SET_XMAX             - save current X as right limit
 *   SET_TRIG_OPEN        - save current trigger pos as open
 *   SET_TRIG_CLOSE       - save current trigger pos as closed
 *   SET_OFFSET:<mm>      - update gun-to-canvas distance
 *   STATUS               - request single POS response
 *   STOP                 - emergency stop
 *
 * Responses:
 *   POS:<xSteps>,<ySteps>,<tSteps>,<limitSwitch>   (every 200ms)
 *   HOMED_Y
 *   FIRED
 *   ACK
 *   ERR:<msg>
 *   READY
 */

#include <AccelStepper.h>
#include <EEPROM.h>

// ── Pins ────────────────────────────────────────────────────────
#define dirPinY  2
#define stepPinY 3
#define limitY   7

#define dirPinX  4
#define stepPinX 5

#define dirPinT  8
#define stepPinT 9

// ── Constants ───────────────────────────────────────────────────
#define STEPS_PER_DEG  17.78f
#define Y_HOME_OFFSET  700
#define TRIGGER_DEFAULT_CLOSE -700
#define TRIGGER_DEFAULT_OPEN   0

// ── EEPROM layout ───────────────────────────────────────────────
#define ADDR_XMIN         0
#define ADDR_XMAX         4
#define ADDR_TRIG_OPEN    8
#define ADDR_TRIG_CLOSE  12
#define ADDR_GUN_OFFSET  16
#define ADDR_YHOME_OFFSET 20

// ── Steppers ────────────────────────────────────────────────────
AccelStepper stepperY(1, stepPinY, dirPinY);
AccelStepper stepperX(1, stepPinX, dirPinX);
AccelStepper stepperT(1, stepPinT, dirPinT);

// ── State ────────────────────────────────────────────────────────
long  xMin        = -5000;
long  xMax        =  5000;
long  trigOpen    = TRIGGER_DEFAULT_OPEN;
long  trigClose   = TRIGGER_DEFAULT_CLOSE;
long  yHomeOffset = 0;
float gunOffset   = 2300.0f;
float canvasWidth = 1800.0f;

String inputBuf  = "";
bool   yHomed    = false;

unsigned long lastStatusMs = 0;

// ── Setup ────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  pinMode(limitY, INPUT_PULLUP);

  stepperY.setMaxSpeed(1000);  stepperY.setAcceleration(1600);  stepperY.setPinsInverted(false, true, false);
  stepperX.setMaxSpeed(1000);  stepperX.setAcceleration(1600);
  stepperT.setMaxSpeed(600);   stepperT.setAcceleration(600);

  // Load calibration
  EEPROM.get(ADDR_XMIN,       xMin);
  EEPROM.get(ADDR_XMAX,       xMax);
  EEPROM.get(ADDR_TRIG_OPEN,  trigOpen);
  EEPROM.get(ADDR_TRIG_CLOSE, trigClose);
  float savedOffset;
  EEPROM.get(ADDR_GUN_OFFSET, savedOffset);
  if (!isnan(savedOffset) && savedOffset > 100) gunOffset = savedOffset;

  long savedYHome;
  EEPROM.get(ADDR_YHOME_OFFSET, savedYHome);
  if (savedYHome > 0 && savedYHome < 10000) yHomeOffset = savedYHome;

  Serial.println("READY");
}

// ── Loop ─────────────────────────────────────────────────────────
void loop() {
  stepperX.run();
  stepperY.run();
  stepperT.run();

  // Serial input
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      inputBuf.trim();
      if (inputBuf.length() > 0) processCommand(inputBuf);
      inputBuf = "";
    } else {
      inputBuf += c;
    }
  }

  // Periodic position broadcast
  if (millis() - lastStatusMs >= 200) {
    lastStatusMs = millis();
    sendPos();
  }
}

// ── Command parser ───────────────────────────────────────────────
void processCommand(const String& cmd) {
  if (cmd == "HOME_Y") {
    homeY();

  } else if (cmd.startsWith("JOG_X:")) {
    stepperX.move(cmd.substring(6).toInt());
    Serial.println("ACK");

  } else if (cmd.startsWith("JOG_Y:")) {
    stepperY.move(cmd.substring(6).toInt());
    Serial.println("ACK");

  } else if (cmd.startsWith("JOG_T:")) {
    stepperT.move(cmd.substring(6).toInt());
    Serial.println("ACK");

  } else if (cmd.startsWith("AIM:")) {
    int comma = cmd.indexOf(',', 4);
    if (comma < 0) { Serial.println("ERR:bad AIM format"); return; }
    float x = cmd.substring(4, comma).toFloat();
    float y = cmd.substring(comma + 1).toFloat();
    stepperX.moveTo(calcXSteps(x));
    stepperY.moveTo(calcYSteps(y));
    Serial.println("ACK");

  } else if (cmd == "FIRE") {
    fire();

  } else if (cmd.startsWith("AIM_FIRE:")) {
    int comma = cmd.indexOf(',', 9);
    if (comma < 0) { Serial.println("ERR:bad AIM_FIRE format"); return; }
    float x = cmd.substring(9, comma).toFloat();
    float y = cmd.substring(comma + 1).toFloat();
    stepperX.moveTo(calcXSteps(x));
    stepperY.moveTo(calcYSteps(y));
    // Wait for both axes, then fire
    while (stepperX.distanceToGo() != 0 || stepperY.distanceToGo() != 0) {
      stepperX.run();
      stepperY.run();
    }
    fire();

  } else if (cmd.startsWith("AIM_STEPS:")) {
    int comma = cmd.indexOf(',', 10);
    if (comma < 0) { Serial.println("ERR:bad AIM_STEPS format"); return; }
    long sx = cmd.substring(10, comma).toInt();
    long sy = cmd.substring(comma + 1).toInt();
    stepperX.moveTo(sx);
    stepperY.moveTo(sy);
    Serial.println("ACK");

  } else if (cmd.startsWith("AIM_FIRE_STEPS:")) {
    int comma = cmd.indexOf(',', 15);
    if (comma < 0) { Serial.println("ERR:bad AIM_FIRE_STEPS format"); return; }
    long sx = cmd.substring(15, comma).toInt();
    long sy = cmd.substring(comma + 1).toInt();
    stepperX.moveTo(sx);
    stepperY.moveTo(sy);
    while (stepperX.distanceToGo() != 0 || stepperY.distanceToGo() != 0) {
      stepperX.run();
      stepperY.run();
    }
    fire();

  } else if (cmd == "SET_YHOME") {
    yHomeOffset = stepperY.currentPosition();
    EEPROM.put(ADDR_YHOME_OFFSET, yHomeOffset);
    stepperY.setCurrentPosition(0);
    Serial.println("ACK");

  } else if (cmd == "SET_XZERO") {
    stepperX.setCurrentPosition(0);
    Serial.println("ACK");

  } else if (cmd == "SET_XMIN") {
    xMin = stepperX.currentPosition();
    EEPROM.put(ADDR_XMIN, xMin);
    Serial.println("ACK");

  } else if (cmd == "SET_XMAX") {
    xMax = stepperX.currentPosition();
    EEPROM.put(ADDR_XMAX, xMax);
    Serial.println("ACK");

  } else if (cmd == "SET_TRIG_OPEN") {
    trigOpen = stepperT.currentPosition();
    EEPROM.put(ADDR_TRIG_OPEN, trigOpen);
    Serial.println("ACK");

  } else if (cmd == "SET_TRIG_CLOSE") {
    trigClose = stepperT.currentPosition();
    EEPROM.put(ADDR_TRIG_CLOSE, trigClose);
    Serial.println("ACK");

  } else if (cmd.startsWith("SET_OFFSET:")) {
    gunOffset = cmd.substring(11).toFloat();
    EEPROM.put(ADDR_GUN_OFFSET, gunOffset);
    Serial.println("ACK");

  } else if (cmd == "STATUS") {
    sendPos();

  } else if (cmd == "STOP") {
    stepperX.stop();
    stepperY.stop();
    stepperT.stop();
    Serial.println("STOPPED");

  } else {
    Serial.print("ERR:unknown cmd: ");
    Serial.println(cmd);
  }
}

// ── Helpers ──────────────────────────────────────────────────────
void sendPos() {
  Serial.print("POS:");
  Serial.print(stepperX.currentPosition());
  Serial.print(",");
  Serial.print(stepperY.currentPosition());
  Serial.print(",");
  Serial.print(stepperT.currentPosition());
  Serial.print(",");
  Serial.println(digitalRead(limitY) == LOW ? 1 : 0);
}

long calcXSteps(float xMm) {
  float halfW = canvasWidth / 2.0f;
  float angle = atan2(halfW - xMm, gunOffset) * (180.0f / PI);
  return (long)round(angle * STEPS_PER_DEG);
}

long calcYSteps(float yMm) {
  float angle = atan2(yMm, gunOffset) * (180.0f / PI);
  return (long)(-round(angle * STEPS_PER_DEG));
}

void fire() {
  stepperT.moveTo(trigClose);
  while (stepperT.distanceToGo() != 0) stepperT.run();
  stepperT.moveTo(trigOpen);
  while (stepperT.distanceToGo() != 0) stepperT.run();
  Serial.println("FIRED");
}

void homeY() {
  Serial.println("HOMING_Y");

  // Slow down for homing
  stepperY.setMaxSpeed(200);
  stepperY.setAcceleration(400);

  // Move away from switch in case we're already on it
  stepperY.move(30);
  stepperY.runToPosition();

  // Drive toward switch slowly until triggered
  stepperY.move(-30000);
  while (digitalRead(limitY) == HIGH) {
    stepperY.run();
  }
  // Hard stop — cancel remaining move immediately
  stepperY.setCurrentPosition(stepperY.currentPosition());

  // Back off 5 steps at a time until switch releases
  while (digitalRead(limitY) == LOW) {
    stepperY.move(5);
    stepperY.runToPosition();
  }

  // Apply saved horizontal offset then mark as zero
  stepperY.setCurrentPosition(0);
  if (yHomeOffset > 0) {
    stepperY.moveTo(yHomeOffset);
    stepperY.runToPosition();
    stepperY.setCurrentPosition(0);
  }

  // Restore normal speed
  stepperY.setMaxSpeed(1000);
  stepperY.setAcceleration(1600);

  yHomed = true;
  Serial.println("HOMED_Y");
}
