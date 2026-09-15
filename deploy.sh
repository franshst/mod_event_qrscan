#! /bin/sh

 gh release create $1 \
     mod_event_qrscan_$1.zip \
     event_qrscan_update.xml \
     --title "Release $1" \
     --notes "Bug fixes and improvements."
