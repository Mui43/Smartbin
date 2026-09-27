#pragma once
#include <stdint.h>

// Independent of networking: call every 5 ms from the sensor task.
class DebouncedInput {
  bool candidate = false;
  bool stable = false;
  uint32_t changedAt = 0;
public:
  bool update(bool detected, uint32_t now) {
    if (detected != candidate) { candidate = detected; changedAt = now; }
    if (candidate != stable && now - changedAt >= 10) stable = candidate;
    return stable;
  }
};

class SensorController {
  DebouncedInput irInput, proximityInput;
  uint32_t openedAt = 0;
  uint32_t phaseAt = 0;
  enum Phase { IDLE, POWER_UP, SORTING, RETURNING } phase = IDLE;
public:
  bool irDetected = false;
  bool proximityDetected = false;
  bool servoOpen = false;
  bool powerOn = false;
  bool irTriggered = false;

  void update(bool irRaw, bool proximityRaw, uint32_t now) {
    const bool ir = irInput.update(irRaw, now);
    const bool proximity = proximityInput.update(proximityRaw, now);
    irTriggered = ir && !irDetected;
    if (proximity && !proximityDetected && phase == IDLE) {
      powerOn = true; phase = POWER_UP; phaseAt = now;
    }
    if (phase == POWER_UP && now - phaseAt >= 150) {
      servoOpen = true; phase = SORTING; openedAt = now;
    }
    if (phase == SORTING && now - openedAt >= 4000) {
      servoOpen = false; phase = RETURNING; phaseAt = now;
    }
    if (phase == RETURNING && now - phaseAt >= 600) {
      powerOn = false; phase = IDLE;
    }
    irDetected = ir;
    proximityDetected = proximity;
  }
};
