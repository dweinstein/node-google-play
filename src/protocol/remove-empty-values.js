import traverse from 'traverse';
import { isEmpty } from 'lodash';

//
// Remove empty fields from the message by **mutating** the object
//
export default (obj) => {
  traverse(obj).forEach(function (x) {
    if (this.isLeaf && typeof x === 'object' && isEmpty(x)) {
      this.remove();
    }
    this.after(function (y) {
      if (typeof x === 'object' && isEmpty(y)) {
        this.remove();
      }
    });
  });
  return obj;
};
