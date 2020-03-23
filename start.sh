touch /tmp/INSTALLED_PACKAGES
PACKAGES="graphviz"
if [ ! "$PACKAGES" == "$(cat /tmp/INSTALLED_PACKAGES)" ]; then
  cd /tmp
  rm -rf notroot
  git clone https://github.com/CrazyPython/notroot
  source notroot/bashrc
  notroot install $PACKAGES
  echo $PACKAGES > /tmp/INSTALLED_PACKAGES

  wget -c https://github.com/Kitware/CMake/releases/download/v3.17.0/cmake-3.17.0-Linux-x86_64.tar.gz -O - | tar -xfz
else
  source /tmp/notroot/bashrc
fi
export PATH=$PATH:/tmp/cmake-3.17.0/bin
cd
pnpm install --reporter silent --prefer-offline --audit false
npm run-script run --silent
