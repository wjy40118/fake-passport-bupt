#!/bin/bash

START_COMMAND="node dist"

if [ "${DETACH}" = true ]; then
    START_COMMAND_PID="${START_COMMAND} & echo \$! > ./${PID_FILE_NAME} &"
    START_COMMAND_NOHUP="nohup bash -c '${START_COMMAND_PID}' > start.out 2> start.err < /dev/null &"
    eval "${START_COMMAND_NOHUP}"
else
    ${START_COMMAND} || exit 1
fi
