#include <AccelStepper.h>
#include <EEPROM.h>

#define dirPinT 8
#define stepPinT 9
#define EEPROM_OPEN_ADDR 0
#define EEPROM_CLOSED_ADDR 4

AccelStepper stepperT = AccelStepper(1, stepPinT, dirPinT);

void waitForKey() {
  while (Serial.available()) Serial.read();
  while (!Serial.available());
  while (Serial.available()) Serial.read();
}

void setup() {
  Serial.begin(9600);
  delay(2000); // wait for Serial Monitor to connect

  stepperT.setMaxSpeed(100);
  stepperT.setAcceleration(50);
  stepperT.setCurrentPosition(0);

  Serial.println("=== TRIGGER CALIBRATION ===");
  Serial.println("Send any key to start moving OPEN...");
  waitForKey();

  // Phase 1: move open direction until user stops it
  Serial.println("Moving OPEN -- send any key when fully open.");
  stepperT.moveTo(100000); // large target so it runs until stopped
  while (!Serial.available()) {
    stepperT.run();
  }
  stepperT.stop();
  stepperT.runToPosition();
  waitForKey();
  long openPos = stepperT.currentPosition();
  Serial.print("Open position: "); Serial.println(openPos);

  // Phase 2: move closed direction until user stops it
  Serial.println("Send any key to start moving CLOSED...");
  waitForKey();
  Serial.println("Moving CLOSED -- send any key when fully closed.");
  stepperT.moveTo(-100000);
  while (!Serial.available()) {
    stepperT.run();
  }
  stepperT.stop();
  stepperT.runToPosition();
  waitForKey();
  long closedPos = stepperT.currentPosition();
  Serial.print("Closed position: "); Serial.println(closedPos);

  // Save to EEPROM
  EEPROM.put(EEPROM_OPEN_ADDR, openPos);
  EEPROM.put(EEPROM_CLOSED_ADDR, closedPos);

  Serial.println("--- Saved to EEPROM ---");
  Serial.print("Open:   "); Serial.println(openPos);
  Serial.print("Closed: "); Serial.println(closedPos);
  Serial.println("Calibration complete.");
}

void loop() {}
