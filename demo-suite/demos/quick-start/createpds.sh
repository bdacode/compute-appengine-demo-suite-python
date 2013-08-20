#! /bin/bash
#set -x

PROJECT=google.com:launchpad
ZONE=us-central1-b
GCUTIL="gcutil --project=$PROJECT"
SNAPSHOT=puppet-conf-model
NUM_DISKS=21

# Create a list of PD names.
PDS=
for i in $(seq 0 `expr $NUM_DISKS - 1`); do
  PDS="$PDS quick-start-$i"
done

echo $PDS

# Delete any existing PDs.
$GCUTIL deletedisk -f --zone=$ZONE $PDS

# Create the new ones.
$GCUTIL adddisk --zone=$ZONE --source_snapshot=$SNAPSHOT $PDS
