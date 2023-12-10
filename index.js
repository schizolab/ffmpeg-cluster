import { Command } from "commander";

const program = new Command()

program
  .name('ffmpeg cluster')
  .description('The cluster node for transcoding videos to vp9, this needs to connect to the master')
  .version('0.2.0')

await program.parseAsync()