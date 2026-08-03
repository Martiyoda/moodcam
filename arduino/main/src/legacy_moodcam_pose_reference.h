#pragma once

// Reference only: these are the physically validated poses from
// moodcam/arduino/main.ino. Do not execute them until pins, directions, and
// limits have been recalibrated for the Inner Synergy arm.
struct LegacyMoodcamPose {
  int base;
  int shoulder;
  int elbow;
  int wrist;
};

constexpr LegacyMoodcamPose LEGACY_MOODCAM_REST = {90, 90, 90, 90};

constexpr LegacyMoodcamPose LEGACY_MOODCAM_PAINT_YELLOW = {172, 158, 73, 17};
constexpr LegacyMoodcamPose LEGACY_MOODCAM_PAINT_RED = {143, 158, 85, 30};
constexpr LegacyMoodcamPose LEGACY_MOODCAM_PAINT_VIOLET = {30, 158, 90, 30};
constexpr LegacyMoodcamPose LEGACY_MOODCAM_PAINT_BLUE = {0, 162, 82, 22};

constexpr LegacyMoodcamPose LEGACY_MOODCAM_WATER = {90, 150, 48, 5};
constexpr int LEGACY_MOODCAM_WATER_WRIST_AMPLITUDE = 5;
constexpr int LEGACY_MOODCAM_WATER_SHAKE_REPETITIONS = 15;
constexpr int LEGACY_MOODCAM_WATER_SHAKE_DELAY_MS = 100;

constexpr LegacyMoodcamPose LEGACY_MOODCAM_TOWEL = {0, 150, 50, 0};
constexpr int LEGACY_MOODCAM_TOWEL_SHOULDER_AMPLITUDE = 5;
constexpr int LEGACY_MOODCAM_TOWEL_BASE_AMPLITUDE = 30;
constexpr int LEGACY_MOODCAM_TOWEL_TAP_REPETITIONS = 10;
constexpr int LEGACY_MOODCAM_TOWEL_TAP_DELAY_MS = 200;

constexpr LegacyMoodcamPose LEGACY_MOODCAM_VERTICAL_START = {90, 155, 70, 0};
constexpr LegacyMoodcamPose LEGACY_MOODCAM_VERTICAL_END = {90, 180, 160, 45};
constexpr LegacyMoodcamPose LEGACY_MOODCAM_LEFT_START = {90, 163, 110, 35};
constexpr LegacyMoodcamPose LEGACY_MOODCAM_LEFT_END = {120, 163, 110, 35};
constexpr LegacyMoodcamPose LEGACY_MOODCAM_RIGHT_START = {90, 163, 110, 35};
constexpr LegacyMoodcamPose LEGACY_MOODCAM_RIGHT_END = {50, 163, 110, 35};

constexpr LegacyMoodcamPose LEGACY_MOODCAM_DIAGONAL_LEFT_START = {120, 155, 95, 30};
constexpr LegacyMoodcamPose LEGACY_MOODCAM_DIAGONAL_LEFT_END = {120, 175, 130, 35};
constexpr LegacyMoodcamPose LEGACY_MOODCAM_DIAGONAL_RIGHT_START = {70, 160, 110, 40};
constexpr LegacyMoodcamPose LEGACY_MOODCAM_DIAGONAL_RIGHT_END = {90, 180, 145, 45};