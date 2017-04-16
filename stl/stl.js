var loadStl = (function () {
    var binaryVector3 = function (view, offset) {
        var v = new THREE.Vector3();
        v.x = view.getFloat32(offset + 0, true);
        v.y = view.getFloat32(offset + 4, true);
        v.z = view.getFloat32(offset + 8, true);
        return v;
    };
    
    var loadBinaryStl = function (buffer) {
        // binary STL
        var view = new DataView(buffer);
        var size = view.getUint32(80, true);
        var geom = new THREE.Geometry();
        var offset = 84;
        console.log('size', size);

        var groups = {};

        var faceIndices = [ 'a', 'b', 'c' ];
        var f, p, vertexIndex;

        for (var i = 0; i < size; i++) {
            var t1 = binaryVector3(view, offset + 12);
            var t2 = binaryVector3(view, offset + 24);
            var t3 = binaryVector3(view, offset + 36);

            var centro = new THREE.Vector3();
            centro.x = (t1.x + t2.x + t3.x) / 3;
            centro.y = (t1.y + t2.y + t3.y) / 3;
            centro.z = (t1.z + t2.z + t3.z) / 3;

            var key = Math.abs(Math.round(centro.z));
            if (!groups[key]) {
                groups[key] = [];
            }

            groups[key].push(i);

            var normal = binaryVector3(view, offset);

            geom.vertices.push(t1);
            geom.vertices.push(t2);
            geom.vertices.push(t3);
            geom.faces.push(new THREE.Face3(i * 3, i * 3 + 1, i * 3 + 2, normal));
            
            offset += 4 * 3 * 4 + 2;
        }

        var keys = Object.keys(groups);

        for (var i = 0; i < keys.length; i += 10) {
            var color = new THREE.Color(0xffffff);
            color.setRGB(Math.random(), Math.random(), Math.random());

            for (var l = 0; l < 10; l++) {
                if (groups[keys[i + l]]) {
                    for (var j = 0; j < groups[keys[i + l]].length; j++) {
                        var face = geom.faces[groups[keys[i + l]][j]];

                        for (var k = 0; k < 3; k++) {
                            face.vertexColors[k] = color;
                        }
                    }
                }
            }
        }

        //console.log(Object.keys(groups).length, groups);

        return geom;
    };

    
    var m2vec3 = function (match) {
        var v = new THREE.Vector3();
        v.x = parseFloat(match[1]);
        v.y = parseFloat(match[2]);
        v.z = parseFloat(match[3]);
        return v;
    };
    var toLines = function (array) {
        var lines = [];
        var h = 0;
        for (var i = 0; i < array.length; i++) {
            if (array[i] === 10) {
                var line = String.fromCharCode.apply(
                    null, array.subarray(h, i));
                lines.push(line);
                h = i + 1;
            }
        }
        lines.push(String.fromCharCode.apply(null, array.subarray(h)));
        return lines;
    }
    var loadTextStl = function (buffer) {
        var lines = toLines(new Uint8Array(buffer));
        var index = 0;
        var scan = function (regexp) {
            while (lines[index].match(/^\s*$/)) index++;
            var r = lines[index].match(regexp);
            return r;
        };    
        var scanOk = function (regexp) {
            var r = scan(regexp);
            if (!r) throw new Error(
                "not text stl: " + regexp.toString() + 
                "=> (line " + (index - 1) + ")" +     
                "[" + lines[index-1] + "]");
            index++;
            return r;
        }
        
        var facetReg = /^\s*facet\s+normal\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)/;
        var vertexReg = /^\s*vertex\s+([^s]+)\s+([^\s]+)\s+([^\s]+)/;
        var geom = new THREE.Geometry();
        scanOk(/^\s*solid\s(.*)/);
        while (!scan(/^\s*endsolid/)) {
            var normal = scanOk(facetReg);
            scanOk(/^\s*outer\s+loop/);
            var v1 = scanOk(vertexReg);
            var v2 = scanOk(vertexReg);
            var v3 = scanOk(vertexReg);
            scanOk(/\s*endloop/);
            scanOk(/\s*endfacet/);
            var base = geom.vertices.length;
            geom.vertices.push(m2vec3(v1));
            geom.vertices.push(m2vec3(v2));
            geom.vertices.push(m2vec3(v3));
            geom.faces.push(
                new THREE.Face3(base, base + 1, base + 2, m2vec3(normal)));
        }
        return geom;
    };
    
    return function (buffer) {
        try {
            console.log("load as text stl");
            return loadTextStl(buffer);
        } catch (ex) {
            console.log(ex);
            console.log("load as binary stl");
            return loadBinaryStl(buffer);
        }
    }; 
})();