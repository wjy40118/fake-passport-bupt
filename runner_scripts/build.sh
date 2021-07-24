#!/bin/bash
docker build --tag charlie0129/fake-passport-bupt . || exit 1
docker push charlie0129/fake-passport-bupt || exit 1