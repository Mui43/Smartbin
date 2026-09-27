#include "../SensorController.h"
#include <cassert>
#include <iostream>

int main() {
  SensorController sensor;
  int count = 0;
  // Ten items pass IR while the sorting servo holds open, regardless of HTTP.
  for (uint32_t now = 0; now <= 5000; now += 5) {
    const bool ir = now < 1000 && now % 100 >= 20 && now % 100 < 60;
    const bool proximity = now >= 20 && now < 100;
    sensor.update(ir, proximity, now);
    if (sensor.irTriggered) ++count;
    if (now == 35) assert(sensor.powerOn && !sensor.servoOpen);
    if (now == 180) assert(sensor.servoOpen);
    if (now == 4000) assert(sensor.servoOpen);
    if (now == 4200) assert(!sensor.servoOpen && sensor.powerOn);
    if (now == 4800) assert(!sensor.powerOn);
  }
  assert(count == 10);
  // Holding the beam broken must count once, and clearing re-arms it.
  count = 0;
  for (uint32_t now = 5000; now < 5200; now += 5) {
    sensor.update(true, false, now);
    if (sensor.irTriggered) ++count;
  }
  assert(count == 1);
  sensor.update(false, false, 5200); sensor.update(false, false, 5210);
  sensor.update(true, true, 5220); sensor.update(true, true, 5230);
  assert(sensor.irTriggered && sensor.powerOn && !sensor.servoOpen);
  sensor.update(false, true, 5380); assert(sensor.servoOpen);
  // Short noise must not trigger detection.
  SensorController noise;
  noise.update(true, true, 0); noise.update(false, false, 5); noise.update(false, false, 20);
  assert(!noise.irTriggered && !noise.servoOpen && !noise.powerOn);
  // millis() wraparound must still close the servo after four seconds.
  SensorController wrap;
  const uint32_t start = UINT32_MAX - 100;
  wrap.update(false, true, start); wrap.update(false, true, start + 10);
  assert(wrap.powerOn && !wrap.servoOpen);
  wrap.update(false, true, uint32_t(start + 160)); assert(wrap.servoOpen);
  wrap.update(false, true, uint32_t(start + 4160));
  assert(!wrap.servoOpen && wrap.powerOn);
  wrap.update(false, true, uint32_t(start + 4760)); assert(!wrap.powerOn);
  std::cout << "PASS: IR during servo movement, no repeated count while held, re-arm, debounce, timer wraparound\n";
}
