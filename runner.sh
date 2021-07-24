#!/bin/bash

# Colors
BOLD="\033[1m"
RED="\033[1;31m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
BLUE="\033[1;34m"
OFF="\033[m"

HEADER_INFO="${BLUE}[INFO]$OFF "
HEADER_WARN="${YELLOW}[WARN]$OFF "
HEADER_ERROR="${RED}[ERROR]$OFF "

# The file used to store the pid of a proviously started background process
PID_FILE_NAME="started_process.pid"

# Default state
SKIP_BUILD=false
SILENT=false
VERBOSE=false

function usage() {
    echo -e "server-app-runner"
    echo -e ""
    echo -e "./runner.sh"
    echo -e "\t start:        build your project, stop a previous process, then start a new one"
    echo -e "\t build:        build your project"
    echo -e "\t stop:         stop a previously started background process"
    echo -e "\t update:       update your project"
    echo -e "\t --skip-build: skip build process when during \"start\""
    echo -e "\t -s --silent:  start project in the background and return"
    echo -e "\t -v --verbose: trun on verbose mode"
    echo -e "\t -h --help:    show this help and exit"
    echo -e ""
}

# Parse auguments
POSITIONAL=()
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
    start)
        COMMAND=start
        shift
        ;;
    build)
        COMMAND=build
        shift
        ;;
    stop)
        COMMAND=stop
        shift
        ;;
    update)
        COMMAND=update
        shift
        ;;
    --skip-build)
        SKIP_BUILD=true
        shift
        ;;
    -s | --silent)
        SILENT=true
        shift
        ;;
    -v | --verbose)
        VERBOSE=true
        shift
        ;;
    -h | --help)
        usage
        exit 0
        ;;
    *)
        echo -e "${HEADER_ERROR}Unknown argument: $1"
        echo ""
        usage
        exit 1
        ;;
    esac
done

# restore positional parameters
set -- "${POSITIONAL[@]}"

# Show configuration (verbose)
if [ "${VERBOSE}" = true ]; then
    echo -e "${HEADER_INFO}operation  = ${YELLOW}${COMMAND}${OFF}"
    if [ "${SKIP_BUILD}" = true ] && [ "${COMMAND}" != start ]; then
        echo -e "${HEADER_ERROR}You can only pair --skip-build with \"start\""
        exit 1
    fi
    echo -e "${HEADER_INFO}skip_build = ${YELLOW}${SKIP_BUILD}${OFF}"
    echo -e "${HEADER_INFO}silent     = ${YELLOW}${SILENT}${OFF}"
fi

if [ "${SKIP_BUILD}" = true ] && [ "${COMMAND}" != start ]; then
    echo -e "${HEADER_ERROR}You can only pair --skip-build with \"start\""
    exit 1
fi

if [ "${SILENT}" = true ] && [ "${COMMAND}" != start ]; then
    echo -e "${HEADER_ERROR}You can only pair -s --silent with \"start\""
    exit 1
fi

handle_error() {
    echo -e "${HEADER_ERROR}$1 failed"
    exit 1
}

build() {
    if [ "${VERBOSE}" = true ]; then
        echo -e "${HEADER_INFO}building..."
    fi
    bash ./runner_scripts/build.sh || handle_error "build"
}

start() {
    if [ "${VERBOSE}" = true ]; then
        echo -e "${HEADER_INFO}pre-starting..."
    fi
    bash ./runner_scripts/pre_start.sh || handle_error "pre-start"

    if [ "${VERBOSE}" = true ]; then
        echo -e "${HEADER_INFO}application starting..."
    fi

    START_COMMAND="$(head -n1 ./runner_scripts/start.sh)"

    if [ "${SILENT}" = true ]; then
        # This will start the process and store the pid of the process
        START_COMMAND_PID="${START_COMMAND} & echo \$! > ./${PID_FILE_NAME} &"
        # This will let it run in the background
        START_COMMAND_NOHUP="nohup bash -c '${START_COMMAND_PID}' > start.out 2> start.err < /dev/null &"
        eval "${START_COMMAND_NOHUP}"
    else
        ${START_COMMAND} || handle_error "start"
    fi

}

stop() {
    PID="$(cat ./${PID_FILE_NAME})"
    IMAGE="$(ps -p "${PID}" -o comm=)"
    if [ "${VERBOSE}" = true ]; then
        echo -e "${HEADER_INFO}killing pid=${PID} image=\"${IMAGE}\" "
    fi
    kill "${PID}"
}

case $COMMAND in
start)
    if [ "${SKIP_BUILD}" = false ]; then
        build
    fi
    stop
    start
    ;;
build)
    build
    ;;
stop)
    stop
    ;;
update)
    bash ./runner_scripts/update.sh || handle_error "update"
    ;;
*)
    echo -e "${HEADER_ERROR}You need to specify an operation"
    usage
    ;;
esac
