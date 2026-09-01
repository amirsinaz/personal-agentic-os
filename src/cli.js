#!/usr/bin/env node
import {spawnSync} from "node:child_process";
import {CURRENT_VERSION} from "./version.js";

const help=`Personal Agentic OS ${CURRENT_VERSION}

Usage:
  npx personal-agentic-os@latest [setup]
  npx personal-agentic-os@latest dashboard /absolute/path/to/config.json
  npx personal-agentic-os@latest sync /absolute/path/to/config.json
  npx personal-agentic-os@latest update /absolute/path/to/config.json
  npx personal-agentic-os@latest optimize <preview|apply|rollback> ...

Commands:
  setup       Check prerequisites and start the approval-gated setup wizard
  dashboard   Start the local dashboard
  sync        Update approved local memory and project state
  update      Check for a newer or required release
  optimize    Preview, apply, or roll back context optimizations
`;

const [command="setup",...args]=process.argv.slice(2);
if(["--help","-h","help"].includes(command)){process.stdout.write(help);process.exit(0);}
if(["--version","-v"].includes(command)){process.stdout.write(`${CURRENT_VERSION}\n`);process.exit(0);}

const modules={setup:"./setup-cli.js",dashboard:"./start-dashboard.js",sync:"./sync-cli.js",update:"./check-update-cli.js",optimize:"./optimize-cli.js"};
const modulePath=modules[command];
if(!modulePath){process.stderr.write(`Unknown command: ${command}\n\n${help}`);process.exit(1);}

if(command==="setup"){
  const git=spawnSync("git",["--version"],{encoding:"utf8"});
  process.stdout.write(`Personal Agentic OS ${CURRENT_VERSION}\nNode.js ${process.versions.node}: ready\nGit: ${git.status===0?"ready":"not found"}\nObsidian: checked in the next step\n\n`);
}
process.argv=[process.argv[0],process.argv[1],...args];
await import(modulePath);
