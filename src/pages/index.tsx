/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @next/next/no-img-element */
import styles from "./index.module.css";
import { type NextPage } from "next";
import Head from "next/head";

import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import { type ChangeEvent, useEffect, useState, useMemo } from "react";
import FileInfo from "~/Components/FileInfo";
import RangeSlider from "~/Components/Range";
import moment, { duration } from "moment";

const ffmpeg = createFFmpeg({
  log: true,
  corePath: "http://localhost:3000/ffmpeg/ffmpeg-core.js",
});

export interface VideoFileInfo {
  duration: string; // Duration of the video
  container: string; // Container format of the video
  video: Array<VideoInfo>; // Video stream info
  audio: Array<AudioInfo>; // Audio stream info
}

export interface VideoInfo {
  videoCodec: string;
  videoWidth: number;
  videoHeight: number;
  aspectRatio: string;
  framerate: number;
  bitrate: number;
}

export interface AudioInfo {
  audioCodec: string;
  audioChannels: string;
  audioChannelLayout: string;
  audioSampleRate: number;
}

function parseFFmpegOutput(output: string[]): VideoFileInfo {
  const info: VideoFileInfo = {
    duration: "",
    container: "",
    video: [],
    audio: [],
  };

  for (const line of output) {
    if (line.startsWith("Input #0")) {
      const containerMatch = line.match(/Input #\d,\s+([\w,]+), from '(.+)':/);
      if (containerMatch) {
        info.container = containerMatch[1] || "";
      }
    }

    const durationMatch = line.match(/Duration:\s+(\d\d:\d\d:\d\d\.\d+)/);
    if (durationMatch && durationMatch[1]) {
      info.duration = durationMatch[1];
    }

    if (line.includes(": Audio:")) {
      const audioCodecRegex = /Audio: (\w+)/;
      const sampleRateRegex = /(\d+) Hz/;
      const channelRegex = / (\d+) channels/;
      const channelLayoutRegex = /, (\w+)$/;

      info.audio.push({
        audioCodec: line.match(audioCodecRegex)?.[1] || "-1",
        audioSampleRate: parseInt(line.match(sampleRateRegex)?.[1] || "-1", 10),
        audioChannels: line.match(channelRegex)?.[1] || "-1",
        audioChannelLayout: line.match(channelLayoutRegex)?.[1] || "-1",
      });
    } else if (line.includes(": Video:")) {
      const videoCodecRegex = /Video: (\w+)/;
      const resolutionRegex = /(\d{3,4})x(\d{3,4})/;
      const aspectRatioRegex = /, SAR (\d+:\d+) DAR (\d+:\d+)/;
      const bitrateRegex = /, (\d+) kb\/s/;
      const framerateRegex = /, (\d+) fps,/;

      const resolutionMatch = line.match(resolutionRegex);

      info.video.push({
        videoCodec: line.match(videoCodecRegex)?.[1] || "-1",
        aspectRatio: line.match(aspectRatioRegex)?.[1] || "-1",
        bitrate: parseInt(line.match(bitrateRegex)?.[1] || "-1", 10),
        framerate: parseInt(line.match(framerateRegex)?.[1] || "-1", 10),
        videoWidth: parseInt(resolutionMatch?.[1] || "-1", 10),
        videoHeight: parseInt(resolutionMatch?.[2] || "-1", 10),
      });
    }
  }
  return info;
}

const Body = ({ children }: { children: React.ReactNode }) => (
  <>
    <Head>
      <title>Video</title>
    </Head>
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Video App</h1>
        <div>{children}</div>
      </div>
    </main>
  </>
);

const Home: NextPage = () => {
  const [ready, setReady] = useState(false);
  const [video, setVideo] = useState<File | null | undefined>(null);
  const [gif, setGif] = useState<string | null>(null);
  const [info, setInfo] = useState<VideoFileInfo | null>(null);
  const [filename, setFilename] = useState("");
  const [ratio, setRatio] = useState(0);
  const [processing, setProcessing] = useState(false);

  const [durationSeconds, setDurationSeconds] = useState(0);
  const [startSeconds, setStartSeconds] = useState(100);

  const videoSrc = useMemo<string>(() => {
    if (!video) return "";
    return URL.createObjectURL(video);
  }, [video]);

  const load = async () => {
    await ffmpeg.load();
    setReady(true);
  };

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.item(0);
    if (!file) return;

    const filename = file.name;

    const output: string[] = [];

    ffmpeg.setLogger(({ message }) => {
      output.push(message);
    });

    ffmpeg.FS("writeFile", `${filename}`, await fetchFile(file));

    const command = [
      "-hide_banner",
      // Input
      "-i",
      filename,
    ];

    await ffmpeg.run(...command);

    const info = parseFFmpegOutput(output);

    console.log("Info", info);
    setVideo(file);
    setInfo(info);
    setFilename(filename);
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  if (!ready) return <Body>Loading...</Body>;

  const convertToGif = async () => {
    if (!video) return;
    setGif(null);

    const output: string[] = [];

    ffmpeg.setLogger(({ message }) => {
      // console.log('++', message);
      output.push(message);
    });

    ffmpeg.setProgress(({ ratio }) => {
      setRatio(ratio);
    });

    ffmpeg.FS("writeFile", "test.mp4", await fetchFile(video));

    const command = [
      // Input
      "-i",
      "test.mp4",
      // Duration
      "-t",
      `${durationSeconds}`,
      // Start
      "-ss",
      `${startSeconds}`,
      // Format
      "-f",
      "gif",
      // Filename
      "out.gif",
    ];

    setProcessing(true);
    await ffmpeg.run(...command);
    setProcessing(false);

    const data = ffmpeg.FS("readFile", "out.gif");

    const url = URL.createObjectURL(
      new Blob([data.buffer], { type: "image/gif" })
    );

    setGif(url);
  };

  const convertToFrag = async () => {
    if (!video) return;
    setGif(null);

    const output: string[] = [];

    ffmpeg.setLogger(({ message }) => {
      // console.log('++', message);
      output.push(message);
    });

    ffmpeg.setProgress(({ ratio }) => {
      setRatio(ratio);
    });

    ffmpeg.FS("writeFile", filename, await fetchFile(video));

    const command = [
      "-hide_banner",
      // Input file
      "-i", filename,
      // // Map all streams from the input - ??
      "-map", "0",
      // // Map all streams from the input - ??
      "-map", "0",
      // // Map all streams from the input - ??
      "-map", "0",
      // // Map all streams from the input - ??
      "-map", "0",
      // Output format (MPEG-DASH)
      "-f", "dash",
      // Set frame rate to 25 fps
      "-r", "25",
      // Total duration of output, in seconds
      "-t", `${durationSeconds}`,
      // Start time from input, in seconds
      "-ss", `${startSeconds}`,
      // Set the segment length in seconds (fractional value can be set). The value is treated as average segment
      // duration when use_template is enabled and use_timeline is disabled and as minimum segment duration for all the
      // other use cases.
      "-seg_duration", "2",
      // Minimum segment duration, in seconds
      // '-segment_time', '2',
      // Use MPEG-DASH template naming
      "-use_template", "1",
      // Use MPEG-DASH timeline
      "-use_timeline", "1",
      // Template for initialization segments
      "-init_seg_name", "init-$RepresentationID$.$ext$",
      // Template for media segments
      "-media_seg_name", "media-$RepresentationID$-$Number$.$ext$",

      // // '-movflags', 'frag_custom',
      "-frag_duration", "2",

      // "-segment_time", "2",
      // // '-segment_format', 'mp4',

      // // Audio codec
      // // '-c:a', 'libfdk_aac',

      // // Video codec
      '-c:v', 'libx264',
      // // Video bitrate for stream 0 (800 kbps)
      '-b:v:0', '800k',
      // // // Video profile for stream 0 (main)
      '-profile:v:0', 'main',
      // // Video bitrate for stream 1 (300 kbps)
      "-b:v:1", "300k",
      // Video size for stream 1 (320x170)
      "-s:v:1", "320x170",
      // Video profile for stream 1 (baseline)
      "-profile:v:1", "baseline",
      
      
      // // // Number of consecutive B-frames
      // // '-bf', '1',
      // // // Minimum interval between IDR-frames (keyframes)
      // // '-keyint_min', '120',
      // // Maximum interval between IDR-frames (keyframes)
      // "-g", "120",
      // // // Scene change detection threshold
      // // '-sc_threshold', '0',
      // // // B-frame decision mode
      // // '-b_strategy', '0',
      // // // Audio sample rate for stream 1 (22050 Hz)
      // // '-ar:a:1', '22050',
      // // Adaptation sets configuration
      // '-adaptation_sets', '"id=0,streams=v id=1,streams=a"',

      // '-period_duration', '10',
      '-adaptation_sets', 'id=0,streams=v id=1,streams=a',
      // '-period_duration', '5',
      '-adaptation_sets', 'id=2,streams=v id=3,streams=a',
      // // // Output filename
      "out.mpd",
    ];

    // '-segment_time', '5',
    // '-segment_format', 'mp4',
    // '-init_seg_name', 'init.mp4',
    // // Duration
    // '-t', `${durationSeconds}`,
    // // Start
    // '-ss', `${startSeconds}`,
    // '-an',
    // 'segment_%d.mp4',
    // ];

    setProcessing(true);
    await ffmpeg.run(...command);
    setProcessing(false);

    const regex = /Opening '(.+)' for writing/;

    const filenames = output
      .filter((line: string) => regex.test(line))
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .map((line: string) => {
        const filename = regex.exec(line);
        if (!filename || !filename[1]) return;

        return filename[1].replace(".tmp", "");
      })
      .filter(Boolean);

    console.log("filenames", filenames);

    const blobs = [...new Set(filenames)].map((filename: string | undefined) => {
      if (!filename) return null;

      const data = ffmpeg.FS("readFile", filename);
      return [
        filename,
        URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" })),
      ];
    });

    blobs.forEach((row: string[] | null) => {
      if (!row) return;

      const a = document.createElement("a");
      console.log("Downloading", row[0]);
      a.href = row[1] || "";
      a.download = row[0] || "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });

    console.log(blobs);
  };

  const renderSeconds = (seconds: number) => {
    const newTime = moment().startOf("day").add({ seconds });

    return newTime.format("HH:mm:ss");
  };

  const timeToSeconds = (time: string) => {
    const [hours, minutes, seconds] = time
      .split(":")
      .map((value) => parseInt(value, 10));

    const date = moment().startOf("day").add({ hours, minutes, seconds });

    const totalSeconds =
      date.seconds() + date.minutes() * 60 + date.hours() * 60 * 60;

    return totalSeconds;
  };

  return (
    <Body>
      <div className={styles.section}>
        <input type="file" onChange={handleChange} />
      </div>

      {video && (
        <div className={styles.section}>
          <video controls width="640" src={videoSrc}></video>
        </div>
      )}

      {info && (
        <div className={styles.section}>
          <FileInfo file={info} />
        </div>
      )}

      <div className={styles.section}>
        <RangeSlider
          label="Start"
          max={timeToSeconds(info?.duration || "00:00:10")}
          render={(value: number) => {
            return renderSeconds(value);
          }}
          value={startSeconds}
          onChange={(value: number) => {
            setStartSeconds(value);
          }}
        />

        <RangeSlider
          label="Duration"
          max={timeToSeconds(info?.duration || "00:00:10")}
          render={(value: number) => {
            return renderSeconds(value);
          }}
          value={durationSeconds}
          onChange={(value: number) => {
            setDurationSeconds(value);
          }}
        />

        <br />
        <br />
        <button
          onClick={() => {
            convertToGif().catch(console.error);
          }}
        >
          Convert to GIF
        </button>

        <button
          onClick={() => {
            convertToFrag().catch(console.error);
          }}
        >
          Convert to Fragmented MP4
        </button>
      </div>

      {processing && (
        <div className={styles.section}>
          <progress />
        </div>
      )}

      {gif && (
        <div className={styles.section}>
          <img title="" src={gif} width="640px" />
        </div>
      )}
    </Body>
  );
};

export default Home;

// const command = [
//   '-re',
//   '-i', 'test.mp4',
//   '-g', '52',
//   // '-c:a', 'aac',
//   // '-b:a', '64k',
//   '-an',
//   '-c:v', 'libx264',
//   '-b:v', '448k',
//   '-f', 'mp4',
//   '-t', '00:00:30',
//   '-movflags', 'frag_keyframe+empty_moov',
//   'output.mp4'
// ];

//       const command = [
//   '-i', 'test.mp4',
//   '-movflags', 'frag_custom',
//   '-frag_duration', '1000',
//   '-segment_time', '1',
//   '-segment_format', 'mp4',
//   '-f', 'segment',
//   '-init_seg_name', 'init.mp4',
//   '-t', '00:00:30',
//   '-an',
//   'segment_%d.mp4',
// ];
