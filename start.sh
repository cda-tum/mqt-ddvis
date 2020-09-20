touch /tmp/INSTALLED_PACKAGES
PACKAGES="cmake"
if [ ! "$PACKAGES" == "$(cat /tmp/INSTALLED_PACKAGES)" ]; then
  cd /tmp
  echo $PACKAGES > /tmp/INSTALLED_PACKAGES
  wget https://github.com/Kitware/CMake/releases/download/v3.17.0/cmake-3.17.0-Linux-x86_64.tar.gz
  tar -xvf cmake-3.17.0-Linux-x86_64.tar.gz
fi
export PATH=$PATH:/tmp/cmake-3.17.0-Linux-x86_64/bin
cd
pnpm install --reporter silent --prefer-offline --audit false
npm run-script run --silent
