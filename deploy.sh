#!/bin/bash
# Deployment Script for t360.pw
#TODO: Implement branch utilization, perhaps make the production/staging release a select? 

# Defaults
quiet=0
verbose=0 # Might put in log messages later...
reset=0
syncd=0
version="0.1.0" # I'll try to follow convention.
appname="t360"
repo=""

# Try not to spread this around...
staging_ip="t360.pw"
staging_port="10045"

out() {
  ((quiet)) && return
  local message="$@"
  printf '%b\n' "$message";
}
die() { out "$@"; exit 1; }
err() { out " \033[1;31m✖\033[0m  $@"; }
success() { out " \033[1;32m✔\033[0m  $@"; }
log() { (($verbose)) && out "$@"; }
notify() { [[ $? == 0 ]] && success "$@" || err "$@"; }
escape() { echo $@ | sed 's/\//\\\//g'; }
confirm() {
  read -p "$1 [y/N] " -n 1;
  [[ $REPLY =~ ^[Yy]$ ]];
}
# Set a trap for cleaning up in case of errors or when script exits.
rollback() {
  die
}

# Print usage
usage() {
  echo -n "$(basename $0) [OPTION]...

Deployment script for $appname. If doesn't exist, deploys, otherwise updates.
Git: $repo

This has only been tested on Debian. Passwordless sudo must have been set up for the account (you can restrict to elevation to www-data)

Staging or Production options must be chosen in order for this script to work.
ie '$(basename $0) -s' for staging and '$(basename $0) -p' for production 
 
 Options:
  -u, --username    Username for script
  
  ------ for deployment ------
  -m, --sync        Synch directory up to the indicated server, specify folder (dev or dist)
  
  ------ for your own info ------
  -q, --quiet       Quiet (no output)
  -h, --help        Display this help and exit
      --version     Output version information and exit
  
"
}

# Iterate over options breaking -ab into -a -b when needed and --foo=bar into
optstring=h
unset options
while (($#)); do
  case $1 in
    # If option is of type -ab
    -[!-]?*)
      # Loop over each character starting with the second
      for ((i=1; i < ${#1}; i++)); do
        c=${1:i:1}

        # Add current char to options
        options+=("-$c")

        # If option takes a required argument, and it's not the last char make
        # the rest of the string its argument
        if [[ $optstring = *"$c:"* && ${1:i+1} ]]; then
          options+=("${1:i+1}")
          break
        fi
      done
      ;;
    # If option is of type --foo=bar
    --?*=*) options+=("${1%%=*}" "${1#*=}") ;;
    # add --endopts for --
    --) options+=(--endopts) ;;
    # Otherwise, nothing special
    *) options+=("$1") ;;
  esac
  shift
done
set -- "${options[@]}"
unset options

trap rollback INT TERM EXIT
safe_exit() {
  trap - INT TERM EXIT
  exit
}

# Print help if no arguments were passed.
[[ $# -eq 0 ]] && set -- "--help"

# Read the options and set stuff
while [[ $1 = -?* ]]; do
  case $1 in
    -u|--username) shift; username=$1 ;;
    -m|--sync) shift; syncd=$1 ;;
    -h|--help) usage >&2; safe_exit ;;
    --version) out "$(basename $0) $version"; safe_exit ;;
    -q|--quiet) quiet=1 ;;
    --endopts) shift; break ;;
    *) die "invalid option: $1" ;;
  esac
  shift
done

# This is the actual stuff.
main() {
  if [ -z "$username" ]; then read -p 'What username would you like to use to deploy: ' username; fi
  local ip=$staging_ip;
  local port=$staging_port;

  # setting up variables
  #suwww is the command you should be using for deployment with the proper environment set
  app="/opt/nginx/html"
  suwww="sudo RBENV_ROOT=/usr/local/rbenv RACK_ENV=production REDIS_SOCK=/var/lib/redis/6379/ctredis.sock -u www-data -g www-data"
  
  if $(confirm "Deploy $appname to $ip:$port with $username?"); then
    echo ""
    # This is the actual guts
    # Check to see if this currently exists and get the config file if it does
    # server_config=$(ssh -p $port $username@$ip "$suwww cat $app 2> /dev/null")

    # update or setup -if nothing else is set, this is what is run.
     if [ "$syncd" != "" ] && [ -d $syncd ]; then
      ssh -p $port $username@$ip "test -d $app && sudo rm -rf $app/*"
      tar --exclude='./video' -czf - -C $syncd . | ssh -p $port $username@$ip "cd $app/..; $suwww tar xvzf - -C html --strip-components=1"
      ssh -p $port $username@$ip "$suwww rm -rf $app/video && $suwww ln -s /home/t360/video $app/video"
      success "Synced App"
    else
      err "$syncd does not seem to be an accessible directory."
    fi

    sync
    if [ $? -eq 0 ]; then # this needs to check for more cases
      success "Successfully uploaded $appname"
    else
      err "Something went wrong =/"
    fi 
  fi
}
(test $staging -ne 1 && test $production -ne 1 && usage >&2 && safe_exit) || main
safe_exit
