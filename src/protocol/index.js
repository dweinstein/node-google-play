import ProtoBuf from 'protobufjs';
import assert from 'assert';
// protobuf initialization
const builder = ProtoBuf.loadProtoFile(__dirname + '/../../data/googleplay.proto');
assert(builder !== null, 'missing protobuf');
export const ResponseWrapper = builder.build("ResponseWrapper");
export const PreFetch = builder.build("PreFetch");
export const BulkDetailsRequest = builder.build("BulkDetailsRequest");
