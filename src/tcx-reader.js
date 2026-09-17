// tcx-reader.js
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  parseTagValue: true,
  trimValues: true,
  isArray: (name) =>
    ["Activity", "Lap", "Track", "Trackpoint", "Course", "CoursePoint"].includes(name),
});

const number = (value) => (value == null || value === "" ? null : Number(value));

function position(pos) {
  if (!pos) return null;

  return {
    latitude: number(pos.LatitudeDegrees),
    longitude: number(pos.LongitudeDegrees),
  };
}

function heartRate(hr) {
  return number(hr?.Value);
}

function parseTrackpoint(point) {
  return {
    time: point.Time ?? null,
    position: position(point.Position),
    altitudeMeters: number(point.AltitudeMeters),
    distanceMeters: number(point.DistanceMeters),
    heartRateBpm: heartRate(point.HeartRateBpm),
    cadenceRpm: number(point.Cadence),
    sensorState: point.SensorState ?? null,
    extensions: point.Extensions ?? null,
    raw: point,
  };
}

function parseLap(lap) {
  const tracks = lap.Track ?? [];
  const trackpoints = tracks.flatMap((track) =>
    (track.Trackpoint ?? []).map(parseTrackpoint),
  );

  return {
    startTime: lap["@_StartTime"] ?? null,
    totalTimeSeconds: number(lap.TotalTimeSeconds),
    distanceMeters: number(lap.DistanceMeters),
    maximumSpeedMps: number(lap.MaximumSpeed),
    calories: number(lap.Calories),
    averageHeartRateBpm: heartRate(lap.AverageHeartRateBpm),
    maximumHeartRateBpm: heartRate(lap.MaximumHeartRateBpm),
    intensity: lap.Intensity ?? null,
    cadenceRpm: number(lap.Cadence),
    triggerMethod: lap.TriggerMethod ?? null,
    notes: lap.Notes ?? null,
    extensions: lap.Extensions ?? null,
    trackpoints,
    raw: lap,
  };
}

function parseActivity(activity) {
  const sport = activity["@_Sport"] ?? null;
  const laps = (activity.Lap ?? []).map(parseLap);

  return {
    id: activity.Id ?? null,
    sport,
    isRunning: sport?.toLowerCase() === "running",
    notes: activity.Notes ?? null,
    creator: activity.Creator ?? null,
    extensions: activity.Extensions ?? null,
    laps,
    raw: activity,
  };
}

/**
 * Parses TCX XML text (e.g. from an uploaded File's .text()) into activities.
 * Each normalized object also contains `raw`, so no XML fields are discarded.
 */
export function parseTcx(xmlText) {
  const parsed = parser.parse(xmlText);

  const trainingCenterDatabase = parsed.TrainingCenterDatabase ?? {};
  const activities = trainingCenterDatabase.Activities?.Activity ?? [];

  return {
    activities: activities.map(parseActivity),
    courses: trainingCenterDatabase.Courses?.Course ?? [],
    folders: trainingCenterDatabase.Folders ?? null,
    author: trainingCenterDatabase.Author ?? null,
    extensions: trainingCenterDatabase.Extensions ?? null,
    raw: parsed,
  };
}

/**
 * Convenience function: parses TCX text and returns a run.xc-shaped object
 * ready to insert into the `runs` table (distance in miles, duration in
 * minutes, elevation gain in feet, average HR in bpm).
 */
export function tcxToRun(xmlText) {
  const { activities } = parseTcx(xmlText);
  const run = activities.find((a) => a.isRunning) ?? activities[0];
  if (!run) return null;

  const allTrackpoints = run.laps.flatMap((lap) => lap.trackpoints);

  const distanceMeters = run.laps.reduce((sum, lap) => sum + (lap.distanceMeters ?? 0), 0);
  const totalSeconds = run.laps.reduce((sum, lap) => sum + (lap.totalTimeSeconds ?? 0), 0);

  // Elevation gain: sum of positive altitude deltas between consecutive points.
  let elevationGainMeters = 0;
  let prevAlt = null;
  allTrackpoints.forEach((pt) => {
    if (pt.altitudeMeters != null) {
      if (prevAlt != null && pt.altitudeMeters > prevAlt) {
        elevationGainMeters += pt.altitudeMeters - prevAlt;
      }
      prevAlt = pt.altitudeMeters;
    }
  });

  // Prefer per-lap average HR if present, else compute from trackpoints.
  const lapAvgHrs = run.laps.map((l) => l.averageHeartRateBpm).filter((v) => v != null);
  let avgHr = null;
  if (lapAvgHrs.length) {
    avgHr = Math.round(lapAvgHrs.reduce((a, b) => a + b, 0) / lapAvgHrs.length);
  } else {
    const hrPoints = allTrackpoints.map((p) => p.heartRateBpm).filter((v) => v != null);
    if (hrPoints.length) {
      avgHr = Math.round(hrPoints.reduce((a, b) => a + b, 0) / hrPoints.length);
    }
  }

  const firstTime = allTrackpoints[0]?.time || run.laps[0]?.startTime;

  return {
    date: firstTime ? firstTime.slice(0, 10) : null,
    distance: distanceMeters ? Math.round((distanceMeters / 1609.34) * 100) / 100 : null,
    duration: totalSeconds ? Math.round(totalSeconds / 60) : null,
    elevation_gain: Math.round(elevationGainMeters * 3.28084), // meters -> feet
    avg_hr: avgHr,
  };
}