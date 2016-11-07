# This file is generated by gyp; do not edit.

TOOLSET := target
TARGET := libxml
DEFS_Debug := \
	'-DNODE_GYP_MODULE_NAME=libxml' \
	'-D_LARGEFILE_SOURCE' \
	'-D_FILE_OFFSET_BITS=64' \
	'-DDEBUG' \
	'-D_DEBUG'

# Flags passed to all source files.
CFLAGS_Debug := \
	-fPIC \
	-pthread \
	-Wall \
	-Wextra \
	-Wno-unused-parameter \
	-m64 \
	-g \
	-O0

# Flags passed to only C files.
CFLAGS_C_Debug :=

# Flags passed to only C++ files.
CFLAGS_CC_Debug := \
	-fno-rtti \
	-fno-exceptions \
	-std=gnu++0x

INCS_Debug := \
	-I/home/ec2-user/.node-gyp/4.3.2/include/node \
	-I/home/ec2-user/.node-gyp/4.3.2/src \
	-I/home/ec2-user/.node-gyp/4.3.2/deps/uv/include \
	-I/home/ec2-user/.node-gyp/4.3.2/deps/v8/include \
	-I$(srcdir)/vendor/libxml/include

DEFS_Release := \
	'-DNODE_GYP_MODULE_NAME=libxml' \
	'-D_LARGEFILE_SOURCE' \
	'-D_FILE_OFFSET_BITS=64'

# Flags passed to all source files.
CFLAGS_Release := \
	-fPIC \
	-pthread \
	-Wall \
	-Wextra \
	-Wno-unused-parameter \
	-m64 \
	-O3 \
	-ffunction-sections \
	-fdata-sections \
	-fno-omit-frame-pointer

# Flags passed to only C files.
CFLAGS_C_Release :=

# Flags passed to only C++ files.
CFLAGS_CC_Release := \
	-fno-rtti \
	-fno-exceptions \
	-std=gnu++0x

INCS_Release := \
	-I/home/ec2-user/.node-gyp/4.3.2/include/node \
	-I/home/ec2-user/.node-gyp/4.3.2/src \
	-I/home/ec2-user/.node-gyp/4.3.2/deps/uv/include \
	-I/home/ec2-user/.node-gyp/4.3.2/deps/v8/include \
	-I$(srcdir)/vendor/libxml/include

OBJS := \
	$(obj).target/$(TARGET)/vendor/libxml/buf.o \
	$(obj).target/$(TARGET)/vendor/libxml/catalog.o \
	$(obj).target/$(TARGET)/vendor/libxml/chvalid.o \
	$(obj).target/$(TARGET)/vendor/libxml/dict.o \
	$(obj).target/$(TARGET)/vendor/libxml/encoding.o \
	$(obj).target/$(TARGET)/vendor/libxml/entities.o \
	$(obj).target/$(TARGET)/vendor/libxml/error.o \
	$(obj).target/$(TARGET)/vendor/libxml/globals.o \
	$(obj).target/$(TARGET)/vendor/libxml/hash.o \
	$(obj).target/$(TARGET)/vendor/libxml/HTMLparser.o \
	$(obj).target/$(TARGET)/vendor/libxml/HTMLtree.o \
	$(obj).target/$(TARGET)/vendor/libxml/legacy.o \
	$(obj).target/$(TARGET)/vendor/libxml/list.o \
	$(obj).target/$(TARGET)/vendor/libxml/parser.o \
	$(obj).target/$(TARGET)/vendor/libxml/parserInternals.o \
	$(obj).target/$(TARGET)/vendor/libxml/pattern.o \
	$(obj).target/$(TARGET)/vendor/libxml/relaxng.o \
	$(obj).target/$(TARGET)/vendor/libxml/SAX2.o \
	$(obj).target/$(TARGET)/vendor/libxml/SAX.o \
	$(obj).target/$(TARGET)/vendor/libxml/tree.o \
	$(obj).target/$(TARGET)/vendor/libxml/threads.o \
	$(obj).target/$(TARGET)/vendor/libxml/uri.o \
	$(obj).target/$(TARGET)/vendor/libxml/valid.o \
	$(obj).target/$(TARGET)/vendor/libxml/xinclude.o \
	$(obj).target/$(TARGET)/vendor/libxml/xlink.o \
	$(obj).target/$(TARGET)/vendor/libxml/xmlIO.o \
	$(obj).target/$(TARGET)/vendor/libxml/xmlmemory.o \
	$(obj).target/$(TARGET)/vendor/libxml/xmlmodule.o \
	$(obj).target/$(TARGET)/vendor/libxml/xmlreader.o \
	$(obj).target/$(TARGET)/vendor/libxml/xmlregexp.o \
	$(obj).target/$(TARGET)/vendor/libxml/xmlsave.o \
	$(obj).target/$(TARGET)/vendor/libxml/xmlschemas.o \
	$(obj).target/$(TARGET)/vendor/libxml/xmlschemastypes.o \
	$(obj).target/$(TARGET)/vendor/libxml/xmlstring.o \
	$(obj).target/$(TARGET)/vendor/libxml/xmlunicode.o \
	$(obj).target/$(TARGET)/vendor/libxml/xmlwriter.o \
	$(obj).target/$(TARGET)/vendor/libxml/xpath.o \
	$(obj).target/$(TARGET)/vendor/libxml/xpointer.o

# Add to the list of files we specially track dependencies for.
all_deps += $(OBJS)

# CFLAGS et al overrides must be target-local.
# See "Target-specific Variable Values" in the GNU Make manual.
$(OBJS): TOOLSET := $(TOOLSET)
$(OBJS): GYP_CFLAGS := $(DEFS_$(BUILDTYPE)) $(INCS_$(BUILDTYPE))  $(CFLAGS_$(BUILDTYPE)) $(CFLAGS_C_$(BUILDTYPE))
$(OBJS): GYP_CXXFLAGS := $(DEFS_$(BUILDTYPE)) $(INCS_$(BUILDTYPE))  $(CFLAGS_$(BUILDTYPE)) $(CFLAGS_CC_$(BUILDTYPE))

# Suffix rules, putting all outputs into $(obj).

$(obj).$(TOOLSET)/$(TARGET)/%.o: $(srcdir)/%.c FORCE_DO_CMD
	@$(call do_cmd,cc,1)

# Try building from generated source, too.

$(obj).$(TOOLSET)/$(TARGET)/%.o: $(obj).$(TOOLSET)/%.c FORCE_DO_CMD
	@$(call do_cmd,cc,1)

$(obj).$(TOOLSET)/$(TARGET)/%.o: $(obj)/%.c FORCE_DO_CMD
	@$(call do_cmd,cc,1)

# End of this set of suffix rules
### Rules for final target.
LDFLAGS_Debug := \
	-pthread \
	-rdynamic \
	-m64

LDFLAGS_Release := \
	-pthread \
	-rdynamic \
	-m64

LIBS :=

$(obj).target/vendor/libxml/xml.a: GYP_LDFLAGS := $(LDFLAGS_$(BUILDTYPE))
$(obj).target/vendor/libxml/xml.a: LIBS := $(LIBS)
$(obj).target/vendor/libxml/xml.a: TOOLSET := $(TOOLSET)
$(obj).target/vendor/libxml/xml.a: $(OBJS) FORCE_DO_CMD
	$(call do_cmd,alink)

all_deps += $(obj).target/vendor/libxml/xml.a
# Add target alias
.PHONY: libxml
libxml: $(obj).target/vendor/libxml/xml.a

# Add target alias to "all" target.
.PHONY: all
all: libxml

# Add target alias
.PHONY: libxml
libxml: $(builddir)/xml.a

# Copy this to the static library output path.
$(builddir)/xml.a: TOOLSET := $(TOOLSET)
$(builddir)/xml.a: $(obj).target/vendor/libxml/xml.a FORCE_DO_CMD
	$(call do_cmd,copy)

all_deps += $(builddir)/xml.a
# Short alias for building this static library.
.PHONY: xml.a
xml.a: $(obj).target/vendor/libxml/xml.a $(builddir)/xml.a

# Add static library to "all" target.
.PHONY: all
all: $(builddir)/xml.a
