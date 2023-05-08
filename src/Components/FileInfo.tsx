/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { type AudioInfo, type VideoFileInfo, type VideoInfo } from "~/pages";
import styles from './FileInfo.module.css';

interface Props {
  file: VideoFileInfo;
}

const FileInfo: React.FC<Props> = ({ file }) => {
  const renderVideoInfo = (video: VideoInfo, index: number) => {
    return (
      <div key={index} className={`${styles.fileInfoVideo} ${styles.fileInfo}`}>
        <ul>
            <li><strong>Video Stream</strong> {index + 1}</li>
            <li><strong>Codec:</strong> {video.videoCodec}</li>
            <li><strong>Resolution:</strong> {video.videoWidth}x{video.videoHeight}</li>
            <li><strong>Aspect Ratio:</strong> {video.aspectRatio}</li>
            <li><strong>Frame Rate:</strong> {video.framerate}</li>
            <li><strong>Bitrate:</strong> {video.bitrate}</li>
        </ul>
      </div>
    );
  };

  const renderAudioInfo = (audio: AudioInfo, index: number) => {
    return (
      <div key={index} className={`${styles.fileInfoAudio} ${styles.fileInfo}`}>
        <ul>
            <li><strong>Audio Stream</strong> {index + 1}</li>
            <li><strong>Codec:</strong> {audio.audioCodec}</li>
            <li><strong>Channels:</strong> {audio.audioChannels}</li>
            <li><strong>Channel Layout:</strong> {audio.audioChannelLayout}</li>
            <li><strong>Sample Rate:</strong> {audio.audioSampleRate}</li>
        </ul>
      </div>
    );
  };

  return (
    <div className={styles.fileInfoContainer}>
      <h2>Video File Information</h2>
      <p>Duration: {file.duration}</p>
      <p>Container: {file.container}</p>
      {file.video.map(renderVideoInfo)}
      {file.audio.map(renderAudioInfo)}
    </div>
  );
};

export default FileInfo;
