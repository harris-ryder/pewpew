//BIG LIST OF CONSTANTS
#define yHomeSteps 700 //STEPS TO TAKE Y FROM MICROSWITCH (ACTIVATED) POSITION TO 0 (So that the gun is horizontal)

#define canvasHeight 1800
#define canvasWidth 1800
#define gunOffset 2300
#define stepsPerRev800 //X and Y Stepper Steps
#define stepsPerRevTrigger 400 //Trigger Stepper Steps
#define gearRatio 8 //Ratio between pulleys
#define degreeToSteps 17.78 //For every one degree angle change, the stepper moves 17.78 steps

#define m 20;



//-----------------------------------------------------------
#include <AccelStepper.h>

#define dirPinY 2
#define stepPinY 3
#define motorInterfaceTypeY 1
#define limitY 7

#define dirPinX 4
#define stepPinX 5
#define motorInterfaceTypeX 1

#define dirPinT 8
#define stepPinT 9
#define motorInterfaceTypeT 1


AccelStepper stepperT = AccelStepper(motorInterfaceTypeT, stepPinT, dirPinT);
AccelStepper stepperY = AccelStepper(motorInterfaceTypeY, stepPinY, dirPinY);
AccelStepper stepperX = AccelStepper(motorInterfaceTypeX, stepPinX, dirPinX);





void setup() {
  int t = 500;
  bool fire = true;
  Serial.begin(9600);
  pinMode(limitY, INPUT_PULLUP);  //Set limit switch

  stepperY.setMaxSpeed(1000);
  stepperY.setAcceleration(1600);
  stepperX.setMaxSpeed(1000);
  stepperX.setAcceleration(1600);
  stepperT.setMaxSpeed(600);
  stepperT.setAcceleration(600);

  

homeY();
delay(100);

    

  
  //homeTrigger();
  //testTrigger();
 // delay(1000);
  //aimAndFire(10, 100, false);

  

    for (int i = 0; i < 51; i++) {
   int xCoord[51] = {6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 15, 15, 15, 15, 14, 13, 12, 11, 10, 10, 10, 10, 10};
    int yCoord[51] = {4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 32, 32, 32, 32, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 20, 19, 18, 17, 16};
    int xVal = xCoord[i]*m;
    int yVal = yCoord[i]*m;
    Serial.println(xVal);
    aimAndFire(xVal, yVal, fire);
    delay(t);
}

  for (int i = 0; i < 51; i++) {
   int xCoord[51] = {10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 8, 7, 9, 9, 9, 9, 9, 10, 11, 12, 11, 10, 19, 20, 21, 22, 23, 24, 25, 26, 27, 27, 27, 27, 26, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19};
    int yCoord[51] = {15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 4, 4, 4, 24, 25, 26, 27, 28, 28, 27, 26, 25, 24, 32, 32, 32, 32, 32, 32, 32, 32, 32, 31, 30, 29, 29, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19};
    int xVal = xCoord[i]*m;
    int yVal = yCoord[i]*m;
    Serial.println(xVal);
    aimAndFire(xVal, yVal, fire);
    delay(t);
}

for (int i = 0; i < 51; i++) {
   int xCoord[51] = {19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 25, 24, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 24, 25, 26, 27, 27, 27, 27, 26, 25, 24, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 24, 25, 26};
    int yCoord[51] = {18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 29, 29, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 20, 20, 20, 20, 19, 18, 17, 17, 17, 17, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 7, 7, 7};
      int xVal = xCoord[i]*m;
    int yVal = yCoord[i]*m;
    Serial.println(xVal);
    aimAndFire(xVal, yVal, fire);
    delay(t);
}
for (int i = 0; i < 51; i++) {
   int xCoord[51] = {27, 27, 27, 27, 26, 25, 24, 23, 22, 21, 20, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 32, 33, 34, 35, 36, 36, 36, 36, 37, 38, 39, 40, 40, 41, 40, 41, 42, 43, 44};
    int yCoord[51] = {7, 6, 5, 4, 4, 4, 4, 4, 4, 4, 4, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 4, 4, 4, 4, 5, 6, 6, 7, 8, 9, 8};
      int xVal = xCoord[i]*m;
    int yVal = yCoord[i]*m;
    Serial.println(xVal);
    aimAndFire(xVal, yVal, fire);
    delay(t);
}

for (int i = 0; i < 51; i++) {
   int xCoord[51] = {45, 46, 47, 47, 47, 45, 39, 39, 48, 48, 48, 49, 50, 51, 51, 51, 51, 52, 53, 54, 55, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 43, 44, 42, 41, 45, 45, 45, 45, 45};
    int yCoord[51] = {7, 6, 6, 5, 4, 6, 6, 5, 6, 5, 4, 4, 4, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 32, 32, 32, 32, 32, 31, 30, 29, 28};
      int xVal = xCoord[i]*m;
    int yVal = yCoord[i]*m;
    Serial.println(xVal);
    aimAndFire(xVal, yVal, fire);
    delay(t);
}




}

void loop() {
  // put your main code here, to run repeatedly:
}



void homeY() {
  Serial.print("limitY pin reading: ");
  Serial.println(digitalRead(limitY));

  stepperY.setCurrentPosition(0);
  stepperY.moveTo(50);
  stepperY.runToPosition();
  Serial.println("Moved +50, now homing...");

  while (digitalRead(limitY)) {
    stepperY.moveTo(10);
    stepperY.run();
    stepperY.setCurrentPosition(0);
    delay(1);
  }

  Serial.println("Limit switch hit, moving to home offset...");
  stepperY.moveTo(yHomeSteps);
  stepperY.runToPosition();
  stepperY.setCurrentPosition(0);
  Serial.println("homeY done");
}

void homeTrigger() {
  stepperT.setCurrentPosition(0);  // Decrease by 1 for next move if needed

  while (digitalRead(limitY)) {      // Make the Stepper move CCW until the switch is activated
    stepperT.moveTo(30);             // Set the position to move to
    stepperT.runToPosition();        // Start moving the stepper
    stepperT.setCurrentPosition(0);  // Decrease by 1 for next move if needed
  }
}


void testTrigger(){

  for (int i = 0; i <= 40; i++) {
  stepperT.moveTo(-700);
  stepperT.runToPosition();
  delay(10);
  stepperT.moveTo(0);
  stepperT.runToPosition();
  }
}

void homeX(int val){

  stepperX.setCurrentPosition(0);

   while (digitalRead(limitY)) {  // Make the Stepper move CCW until the switch is activated
    stepperX.moveTo(val);        // Set the position to move to
    stepperX.runToPosition();    // Start moving the stepper
    stepperX.setCurrentPosition(0);
  }

}

void aimAndFire(int x, int y, bool fire) {
  rotateY(calculateYAngleSteps(y));
  rotateX(calculateXAngleSteps(x));

  Serial.println("working2");

  if (fire) {pullTrigger();}


}

int calculateYAngleSteps(int y){

  float angle = atan2(y, gunOffset) * 180 / 3.14159265; //degrees
  return -round(angle * degreeToSteps); //returns how many steps the stpper motor needs to take to achieve desired angle


}

int calculateXAngleSteps(int x){

  float halfW = canvasWidth/2;

  float angle = atan2(halfW - x, gunOffset) * 180 / 3.14159265; //degrees
  return round(angle * degreeToSteps); //returns how many steps the stpper motor needs to take to achieve desired angle


}

void rotateY(int steps) {
   stepperY.moveTo(steps);        // Set the position to move to
   stepperY.runToPosition(); 
}

void rotateX(int steps) {
   stepperX.moveTo(steps);        // Set the position to move to
   stepperX.runToPosition(); 
}

void pullTrigger() {
  stepperT.moveTo(-700);
  stepperT.runToPosition();
  stepperT.moveTo(0);
  stepperT.runToPosition();

}



