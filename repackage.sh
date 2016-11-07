cd build
unzip scsb-ongoing-accessions-development.zip -d temp/
cd temp
rm -fr ec2-linux-bindings-libxmljs
rm -fr node_modules/marcjs/node_modules/libxmljs/*
cp -fr ../../ec2-linux-bindings-libxmljs/* node_modules/marcjs/node_modules/libxmljs/
zip -9r scsb-ongoing-accessions-development.zip *
cd ..
rm scsb-ongoing-accessions-development.zip
mv temp/scsb-ongoing-accessions-development.zip .
rm -fr temp