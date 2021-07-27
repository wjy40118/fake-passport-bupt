#!/bin/bash

PID="$(cat ./${PID_FILE_NAME})"
IMAGE="$(ps -p "${PID}" -o comm=)"

if [ "${IMAGE}" != "" ]; then
    if [ "${VERBOSE}" = true ]; then
        echo -e "${HEADER_INFO}killing process, pid=${BOLD}${PID}${OFF} image=${BOLD}${IMAGE}${OFF} "
    fi
    kill "${PID}"
else
    if [ "${VERBOSE}" = true ]; then
        echo -e "${HEADER_INFO}pid=${GREY}${PID}${OFF} does not exist, skipping..."
    fi
fi